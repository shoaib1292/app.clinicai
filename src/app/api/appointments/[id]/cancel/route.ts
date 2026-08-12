import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { computeRefund } from '@/lib/schedule'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'
import { resolveCalendarProvider } from '@/lib/providers/registry'

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

  // ── Google Calendar Sync (async, non-blocking) ──
  syncCalendarCancel(id, clinicId).catch(() => {})

  store.publish(`clinic:${clinicId}:queue`, { type: 'slot_cancelled', appointmentId: id, slotId: appt.slotId })

  // ── Void referral event ──
  const referralEvent = await db.referralEvent.findUnique({ where: { appointmentId: id } })
  if (referralEvent && referralEvent.status === 'booked') {
    await db.referralEvent.update({
      where: { id: referralEvent.id },
      data: { status: 'cancelled', rewardStatus: 'void' },
    })
  }

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'appointment_cancelled', target: id, metadata: { reason, refund } })

  return ok({ cancelled: true, refund })
}

async function syncCalendarCancel(appointmentId: string, clinicId: string) {
  try {
    const calResult = await resolveCalendarProvider(clinicId)
    if (!calResult) return

    const gEvent = await db.googleCalendarEvent.findFirst({
      where: { appointmentId },
    })
    if (!gEvent) return

    await calResult.provider.deleteEvent(gEvent.id)
  } catch (e) {
    console.error('Calendar cancel sync failed for appointment', appointmentId, e)
  }
}

export const POST = handle(cancel)
