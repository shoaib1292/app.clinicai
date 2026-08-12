import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { resolveCalendarProvider } from '@/lib/providers/registry'

export const POST = handle(async (req: NextRequest) => {
  const { clinicId } = await requireClinicScope()

  const calResult = await resolveCalendarProvider(clinicId)
  if (!calResult) return err('No Google Calendar connection', 400)

  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const monthLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  try {
    const events = await calResult.provider.listEvents(monthAgo, monthLater)

    for (const event of events) {
      const existing = await db.googleCalendarEvent.findUnique({
        where: {
          connectionId_googleCalendarId_id: {
            connectionId: calResult.type === 'google' ? (calResult.provider as any).connectionId : '',
            googleCalendarId: 'primary',
            id: event.providerEventId,
          },
        },
      })

      if (event.status === 'cancelled') {
        if (existing) {
          await db.googleCalendarEvent.delete({ where: { id: event.providerEventId } })
        }
      } else if (!existing) {
        // Get the connection ID from the provider
        const connection = await db.googleConnection.findFirst({
          where: { clinicId, status: 'active' },
          select: { id: true },
        })
        if (connection) {
          await db.googleCalendarEvent.create({
            data: {
              id: event.providerEventId,
              connectionId: connection.id,
              clinicId,
              googleCalendarId: 'primary',
              status: event.status,
              syncedAt: new Date(),
            },
          })
        }
      } else {
        await db.googleCalendarEvent.update({
          where: { id: event.providerEventId },
          data: { status: event.status, syncedAt: new Date() },
        })
      }
    }

    await db.googleAuditLog.create({
      data: {
        clinicId,
        action: 'calendar_sync',
        metadata: JSON.stringify({ eventsSynced: events.length, type: 'manual' }),
      },
    })

    return ok({ synced: true, eventsSynced: events.length })
  } catch (e) {
    console.error('[calendar/sync] Force sync failed', e)
    return err('Sync failed', 500)
  }
})
