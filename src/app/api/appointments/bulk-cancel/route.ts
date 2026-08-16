import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { computeRefund } from '@/lib/schedule'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

// Bulk cancel appointments.
// Body: { appointmentIds: string[], reason?: string }
// Only active appointments (booked/confirmed/held) are cancelled; others are skipped.
// Returns per-appointment results.
async function bulkCancel(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = (await req.json()) as {
    appointmentIds: string[]
    reason?: string
  }

  if (!Array.isArray(body.appointmentIds) || body.appointmentIds.length === 0) {
    return err('appointmentIds array required', 400)
  }
  if (body.appointmentIds.length > 100) {
    return err('Max 100 appointments per bulk operation', 400)
  }

  // Fetch all appointments in one query, scoped to clinic
  const appts = await db.appointment.findMany({
    where: { id: { in: body.appointmentIds }, clinicId },
    include: { slot: true },
  })

  const results: Array<{ id: string; ok: boolean; status: string; refund?: number; error?: string }> = []
  let cancelled = 0
  let skipped = 0

  for (const appt of appts) {
    // Skip terminal statuses
    if (appt.status === 'cancelled' || appt.status === 'completed' || appt.status === 'invalid') {
      results.push({ id: appt.id, ok: false, status: appt.status, error: `Already ${appt.status}` })
      skipped++
      continue
    }

    try {
      // Compute refund based on time-to-appointment
      const refund = computeRefund(appt.start, appt.totalFee)

      // Update appointment
      await db.appointment.update({
        where: { id: appt.id },
        data: {
          status: 'cancelled',
          paymentStatus: refund > 0 ? 'refund_due' : appt.paymentStatus,
          notes: body.reason ? `${appt.notes || ''}\nBulk cancel: ${body.reason}`.trim() : appt.notes,
        },
      })

      // Release slot
      if (appt.slotId) {
        await db.slot.update({
          where: { id: appt.slotId },
          data: { status: 'open', holdExpiresAt: null },
        })
      }

      // Cancel pending reminders
      await db.reminder.updateMany({
        where: { appointmentId: appt.id, status: 'pending' },
        data: { status: 'failed', error: 'appointment_cancelled' },
      })

      // Publish realtime event
      await store.publish(`clinic:${clinicId}:queue`, {
        type: 'slot_cancelled',
        appointmentId: appt.id,
        slotId: appt.slotId,
      })

      // Audit log
      await auditLog({
        actorId: session.sub,
        actorType: session.type,
        clinicId,
        action: 'appointment_cancelled',
        target: appt.id,
        metadata: { reason: body.reason || null, refund, bulk: true },
      })

      results.push({ id: appt.id, ok: true, status: 'cancelled', refund })
      cancelled++
    } catch (e) {
      results.push({ id: appt.id, ok: false, status: appt.status, error: 'Internal error' })
      skipped++
    }
  }

  return ok({
    cancelled,
    skipped,
    total: appts.length,
    results,
  })
}

export const POST = handle(bulkCancel)
