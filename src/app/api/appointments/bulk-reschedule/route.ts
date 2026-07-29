import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'
import { findBlockingOverride } from '@/lib/schedule'

async function bulkReschedule(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = (await req.json()) as {
    appointmentIds: string[]
    newDoctorId?: string
    newDate?: string
    newSlotId?: string
    reason?: string
  }

  const ids = body.appointmentIds
  if (!Array.isArray(ids) || ids.length === 0) return err('appointmentIds array required', 400)
  if (ids.length > 100) return err('Max 100 appointments per bulk request', 400)
  if (!body.newSlotId && (!body.newDoctorId || !body.newDate)) {
    return err('Provide newSlotId, or both newDoctorId and newDate', 400)
  }

  const requestedDoctorId = body.newDoctorId
  const requestedDate = body.newDate

  // Fetch all appointments + optionally all doctors in 2 queries (instead of N*2)
  const [allAppts, allDoctors] = await Promise.all([
    db.appointment.findMany({
      where: { id: { in: ids }, clinicId },
      include: { slot: true },
    }),
    requestedDoctorId
      ? db.doctor.findMany({ where: { id: requestedDoctorId, clinicId }, select: { id: true, slotDurationMin: true, name: true } })
      : db.doctor.findMany({ where: { clinicId }, select: { id: true, slotDurationMin: true, name: true } }),
  ])

  const doctorMap = new Map(allDoctors.map((d) => [d.id, d as { id: string; slotDurationMin: number; name: string }]))

  // If a single target slot is given, fetch it once
  let preFetchedTargetSlot: { id: string; date: Date; startTime: string; endTime: string; durationMin: number } | null = null
  if (body.newSlotId) {
    preFetchedTargetSlot = await db.slot.findFirst({
      where: { id: body.newSlotId, clinicId },
      select: { id: true, date: true, startTime: true, endTime: true, durationMin: true },
    })
  }

  const results: { id: string; status: string; error?: string }[] = []
  let rescheduled = 0
  let skipped = 0
  let failed = 0

  const reminderCreates: Array<{ appointmentId: string; type: string; sendAt: Date; status: string; channel: string }> = []

  for (const id of ids) {
    try {
      const appt = allAppts.find((a) => a.id === id)
      if (!appt) { skipped++; results.push({ id, status: 'skipped', error: 'not found' }); continue }
      if (appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'invalid') {
        skipped++; results.push({ id, status: 'skipped', error: 'terminal' }); continue
      }

      const newDoctorId = requestedDoctorId || appt.doctorId
      const doc = doctorMap.get(newDoctorId)
      if (!doc) { failed++; results.push({ id, status: 'failed', error: 'doctor not found' }); continue }

      let targetSlotId = body.newSlotId
      let targetSlot: typeof preFetchedTargetSlot = preFetchedTargetSlot || null

      if (!targetSlotId) {
        const dayStart = new Date(`${requestedDate}T00:00:00Z`)
        const dayEnd = new Date(`${requestedDate}T23:59:59Z`)
        targetSlot = await db.slot.findFirst({
          where: { doctorId: newDoctorId, clinicId, status: 'open', date: { gte: dayStart, lte: dayEnd } },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          select: { id: true, date: true, startTime: true, endTime: true, durationMin: true },
        })
        if (!targetSlot) { failed++; results.push({ id, status: 'failed', error: 'no open slot' }); continue }
        targetSlotId = targetSlot.id
      }

      // Check leave/block override
      if (targetSlot) {
        const blocking = await findBlockingOverride({
          doctorId: newDoctorId,
          slotDate: new Date(targetSlot.date),
          startTime: targetSlot.startTime,
          endTime: targetSlot.endTime,
        })
        if (blocking?.type === 'leave' || blocking?.type === 'block') {
          failed++
          results.push({ id, status: 'failed', error: 'target slot is within a leave/blocked range' })
          continue
        }
      }

      const lockToken = await store.acquireLock(`slot:${targetSlotId}`, 300)
      if (!lockToken) { failed++; results.push({ id, status: 'failed', error: 'slot locked' }); continue }

      try {
        const newSlot = await db.slot.findFirst({
          where: { id: targetSlotId, doctorId: newDoctorId, clinicId },
          select: { id: true, date: true, startTime: true, durationMin: true, status: true },
        })
        if (!newSlot || newSlot.status !== 'open') {
          failed++; results.push({ id, status: 'failed', error: 'slot unavailable' }); continue
        }

        const slotDuration = newSlot.durationMin || (doc as { id: string; slotDurationMin: number; name: string }).slotDurationMin
        const newStart = new Date(newSlot.date)
        const [sh, sm] = newSlot.startTime.split(':').map(Number)
        const pktMin = sh * 60 + sm
        const utcMin = pktMin - 300
        newStart.setTime(newStart.getTime() + utcMin * 60 * 1000)
        const newEnd = new Date(newStart.getTime() + slotDuration * 60 * 1000)

        const claimNew = await db.slot.updateMany({
          where: { id: targetSlotId, status: 'open' },
          data: { status: 'booked', holdExpiresAt: null },
        })
        if (claimNew.count === 0) {
          failed++; results.push({ id, status: 'failed', error: 'slot unavailable' }); continue
        }

        // Release old slot + update appointment in parallel (different rows, no conflict)
        await Promise.all([
          appt.slotId
            ? db.slot.update({ where: { id: appt.slotId }, data: { status: 'open', holdExpiresAt: null } })
            : Promise.resolve(),
          db.appointment.update({
            where: { id },
            data: {
              start: newStart,
              end: newEnd,
              slotId: targetSlotId,
              doctorId: newDoctorId,
              status: 'booked',
              notes: body.reason ? `${appt.notes || ''}\nRescheduled: ${body.reason}`.trim() : appt.notes,
            },
          }),
        ])

        // Delete pending reminders for this appointment
        await db.reminder.deleteMany({ where: { appointmentId: id, status: 'pending' } })

        // Collect reminder creates for batch insert later
        const reminderOffset = 30 * 60 * 1000
        const sendAt = new Date(newStart.getTime() - reminderOffset)
        if (sendAt > new Date()) {
          reminderCreates.push({ appointmentId: id, type: 'reminder_30min', sendAt, status: 'pending', channel: 'whatsapp' })
        }

        await store.publish(`clinic:${clinicId}:queue`, {
          type: 'appointment_rescheduled',
          appointmentId: id,
          oldStart: appt.start,
          newStart,
          doctorId: newDoctorId,
        })

        rescheduled++
        results.push({ id, status: 'rescheduled' })
      } finally {
        await store.releaseLock(`slot:${targetSlotId}`, lockToken)
      }
    } catch (e) {
      failed++
      results.push({ id, status: 'failed', error: String(e) })
    }
  }

  // Batch create all reminders at once
  if (reminderCreates.length > 0) {
    await db.reminder.createMany({ data: reminderCreates })
  }

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'appointment_bulk_rescheduled',
    metadata: { count: ids.length, rescheduled, skipped, failed, reason: body.reason || null },
  })

  return ok({ rescheduled, skipped, failed, results })
}

export const POST = handle(bulkReschedule)
