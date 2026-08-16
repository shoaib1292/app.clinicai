import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'
import { resolveCalendarProvider } from '@/lib/providers/registry'

// Reschedule an appointment to a new slot (optionally on a different doctor).
// - Releases the old slot (status → open)
// - Claims the new slot (status → booked)
// - Updates appointment start/end/slotId/doctorId
// - Syncs Google Calendar event
// - Deletes old pending reminders, creates new ones at T-24h / T-2h / T-30min
async function reschedule(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = (await req.json()) as {
    newSlotId: string
    newDoctorId?: string
    reason?: string
  }

  if (!body.newSlotId) return err('newSlotId is required', 400)

  // Fetch the appointment
  const appt = await db.appointment.findFirst({
    where: { id, clinicId },
    include: { slot: true },
  })
  if (!appt) return err('Appointment not found', 404)

  // Only allow reschedule for non-terminal statuses
  if (appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'invalid') {
    return err(`Cannot reschedule a ${appt.status} appointment`, 400)
  }

  const newDoctorId = body.newDoctorId || appt.doctorId

  // Verify doctor belongs to clinic
  const doc = await db.doctor.findFirst({ where: { id: newDoctorId, clinicId } })
  if (!doc) return err('Doctor not found in clinic', 404)

  // Acquire lock on the new slot to prevent concurrent booking
  const lockToken = await store.acquireLock(`slot:${body.newSlotId}`, 300)
  if (!lockToken) return err('Slot is being booked by someone else — please pick another', 409)

  try {
    // Verify new slot is open + belongs to the doctor
    const newSlot = await db.slot.findFirst({
      where: { id: body.newSlotId, doctorId: newDoctorId, clinicId },
    })
    if (!newSlot) return err('Slot not found for this doctor', 404)
    if (newSlot.status !== 'open') return err('Slot is not available', 409)

    // Compute new start/end from slot.date + slot.startTime
    const newStart = new Date(newSlot.date)
    const [sh, sm] = newSlot.startTime.split(':').map(Number)
    newStart.setUTCHours(sh, sm, 0, 0)
    const newEnd = new Date(newStart.getTime() + doc.slotDurationMin * 60 * 1000)

    // Release the old slot (if any)
    if (appt.slotId) {
      await db.slot.update({
        where: { id: appt.slotId },
        data: { status: 'open', holdExpiresAt: null },
      })
    }

    // Claim the new slot
    await db.slot.update({
      where: { id: body.newSlotId },
      data: { status: 'booked', holdExpiresAt: null },
    })

    // Update the appointment
    const updated = await db.appointment.update({
      where: { id },
      data: {
        start: newStart,
        end: newEnd,
        slotId: body.newSlotId,
        doctorId: newDoctorId,
        status: 'booked',
        notes: body.reason ? `${appt.notes || ''}\nRescheduled: ${body.reason}`.trim() : appt.notes,
      },
    })

    // Reschedule reminders: delete old pending ones, create new ones at T-24h, T-2h, T-30min
    await db.reminder.deleteMany({
      where: { appointmentId: id, status: 'pending' },
    })
    const reminderOffsets = [
      { type: 'reminder_24h', ms: 24 * 60 * 60 * 1000 },
      { type: 'reminder_2h', ms: 2 * 60 * 60 * 1000 },
      { type: 'reminder_30min', ms: 30 * 60 * 1000 },
    ]
    for (const r of reminderOffsets) {
      const sendAt = new Date(newStart.getTime() - r.ms)
      // Only schedule future reminders
      if (sendAt > new Date()) {
        await db.reminder.create({
          data: {
            appointmentId: id,
            type: r.type,
            sendAt,
            status: 'pending',
            channel: 'whatsapp',
          },
        })
      }
    }

    // ── Google Calendar Sync (async, non-blocking) ──
    syncCalendarReschedule(id, clinicId, doc.name, newStart, newEnd).catch(() => {})

    // Publish realtime event
    await store.publish(`clinic:${clinicId}:queue`, {
      type: 'appointment_rescheduled',
      appointmentId: id,
      oldStart: appt.start,
      newStart,
      doctorId: newDoctorId,
    })

    // Audit log
    await auditLog({
      actorId: session.sub,
      actorType: session.type,
      clinicId,
      action: 'appointment_rescheduled',
      target: id,
      metadata: {
        oldStart: appt.start.toISOString(),
        newStart: newStart.toISOString(),
        oldDoctorId: appt.doctorId,
        newDoctorId,
        oldSlotId: appt.slotId,
        newSlotId: body.newSlotId,
        reason: body.reason || null,
      },
    })

    return ok({
      appointment: { id: updated.id, start: updated.start, end: updated.end, status: updated.status, slotId: updated.slotId },
      rescheduled: true,
    })
  } finally {
    await store.releaseLock(`slot:${body.newSlotId}`, lockToken)
  }
}

async function syncCalendarReschedule(
  appointmentId: string,
  clinicId: string,
  doctorName: string,
  newStart: Date,
  newEnd: Date,
) {
  try {
    const calResult = await resolveCalendarProvider(clinicId)
    if (!calResult) return

    // Find the Google Calendar event for this appointment
    const gEvent = await db.googleCalendarEvent.findFirst({
      where: { appointmentId },
    })
    if (!gEvent) return

    await calResult.provider.updateEvent(gEvent.id, {
      start: newStart,
      end: newEnd,
      summary: `${doctorName} — Appointment (Rescheduled)`,
    })
  } catch (e) {
    console.error('Calendar reschedule sync failed for appointment', appointmentId, e)
  }
}

export const POST = handle(reschedule)
