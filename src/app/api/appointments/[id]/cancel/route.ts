import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { computeRefund } from '@/lib/schedule'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

async function cancel(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const reason = (body as { reason?: string }).reason

  const appt = await db.appointment.findFirst({ where: { id, clinicId }, include: { slot: true, fees: true } })
  if (!appt) return err('Not found', 404)
  if (appt.status === 'cancelled') return err('Already cancelled', 400)

  // Refund platform fee per policy (full >4h, 50% 2-4h, 0% <2h)
  const refund = computeRefund(appt.start, appt.platformFee)

  await db.appointment.update({ where: { id }, data: { status: 'cancelled', paymentStatus: refund > 0 ? 'refund_due' : 'pending', notes: reason ? `${appt.notes || ''}\nCancel reason: ${reason}`.trim() : appt.notes } })

  // Free the slot
  if (appt.slotId) {
    await db.slot.update({ where: { id: appt.slotId }, data: { status: 'open', holdExpiresAt: null } })
  }

  // Credit refund to clinic
  if (refund > 0) {
    const lastEntry = await db.creditLedger.findFirst({ where: { clinicId }, orderBy: { createdAt: 'desc' } })
    const balanceAfter = (lastEntry?.balanceAfter ?? 0) + refund
    await db.creditLedger.create({
      data: { clinicId, type: 'credit', amount: refund, reason: 'refund', appointmentId: id, balanceAfter },
    })
    await db.clinic.update({ where: { id: clinicId }, data: { creditBalance: balanceAfter } })
  }

  // Cancel pending reminders
  await db.reminder.updateMany({ where: { appointmentId: id, status: 'pending' }, data: { status: 'failed', error: 'appointment_cancelled' } })

  store.publish(`clinic:${clinicId}:queue`, { type: 'slot_cancelled', appointmentId: id, slotId: appt.slotId })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'appointment_cancelled', target: id, metadata: { reason, refund } })

  return ok({ cancelled: true, refund })
}

export const POST = handle(cancel)
