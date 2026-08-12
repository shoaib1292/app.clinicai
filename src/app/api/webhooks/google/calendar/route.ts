import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { GoogleCalendarProvider } from '@/lib/providers/calendar/google'

// POST /api/webhooks/google/calendar
// Handles Google Calendar push notifications for real-time event changes.
// Receives events when a doctor creates/modifies/deletes events in Google Calendar directly.
// Syncs the changes back to ClinicAI's DB slots.

export const POST = handle(async (req: NextRequest) => {
  const resourceId = req.headers.get('x-goog-resource-id')
  const channelId = req.headers.get('x-goog-channel-id')
  const resourceUri = req.headers.get('x-goog-resource-uri')

  if (!resourceId) return err('Missing x-goog-resource-id', 400)

  // Resolve which connection this webhook belongs to
  const connection = await db.googleConnection.findFirst({
    where: { calendarResourceId: resourceId },
    select: { id: true, clinicId: true, calendarSyncToken: true },
  })

  if (!connection) {
    // Unknown channel — Google will retry. Acknowledge anyway.
    return ok({ received: true })
  }

  const clinic = await db.clinic.findUnique({
    where: { id: connection.clinicId },
    select: { timezone: true },
  })

  const provider = new GoogleCalendarProvider(
    connection.id,
    connection.clinicId,
    clinic?.timezone || 'Asia/Karachi',
  )

  // Fetch changed events since last sync
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const monthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  try {
    const events = await provider.listEvents(monthAgo, monthLater)

    for (const event of events) {
      const existing = await db.googleCalendarEvent.findUnique({
        where: {
          connectionId_googleCalendarId_id: {
            connectionId: connection.id,
            googleCalendarId: 'primary',
            id: event.providerEventId,
          },
        },
      })

      if (event.status === 'cancelled') {
        // Event deleted in Google Calendar
        if (existing?.appointmentId) {
          // If linked to an appointment, mark the slot as blocked
          const appt = await db.appointment.findUnique({
            where: { id: existing.appointmentId },
            select: { slotId: true },
          })
          if (appt?.slotId) {
            await db.slot.update({
              where: { id: appt.slotId },
              data: { status: 'blocked' },
            })
          }
        }
        await db.googleCalendarEvent.delete({ where: { id: event.providerEventId } })

      } else if (existing) {
        // Event updated in Google Calendar — reschedule if linked to appointment
        await db.googleCalendarEvent.update({
          where: { id: event.providerEventId },
          data: { status: event.status, syncedAt: new Date() },
        })

        if (existing.appointmentId) {
          await db.appointment.update({
            where: { id: existing.appointmentId },
            data: { start: event.start, end: event.end },
          })
        }
      } else {
        // New event created manually in Google Calendar — block the slot
        await db.googleCalendarEvent.create({
          data: {
            id: event.providerEventId,
            connectionId: connection.id,
            clinicId: connection.clinicId,
            googleCalendarId: 'primary',
            status: event.status,
            syncedAt: new Date(),
          },
        })

        // If this overlaps with existing slots, mark them as blocked
        const dateStr = event.start.toISOString().slice(0, 10)
        const overlappingSlots = await db.slot.findMany({
          where: {
            clinicId: connection.clinicId,
            date: new Date(dateStr),
            status: 'open',
          },
        })

        for (const slot of overlappingSlots) {
          const slotDate = new Date(slot.date)
          const [sh, sm] = slot.startTime.split(':').map(Number)
          const [eh, em] = slot.endTime.split(':').map(Number)
          const slotStart = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), sh, sm))
          const slotEnd = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), eh, em))

          // Check overlap
          if (slotStart < event.end && slotEnd > event.start) {
            await db.slot.update({
              where: { id: slot.id },
              data: { status: 'blocked' },
            })
          }
        }
      }
    }

    // Log the sync
    await db.googleAuditLog.create({
      data: {
        clinicId: connection.clinicId,
        connectionId: connection.id,
        action: 'calendar_sync',
        metadata: JSON.stringify({ eventsSynced: events.length }),
      },
    })

  } catch (e) {
    console.error('Calendar webhook sync error', e)
    return err('Sync failed', 500)
  }

  return ok({ synced: true })
})
