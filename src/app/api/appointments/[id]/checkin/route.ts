import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'
import { sendWhatsAppMessage } from '@/lib/followup-rules'

// Check-in a patient (mark as completed, set checkInTime)
async function checkIn(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const appt = await db.appointment.findFirst({ where: { id, clinicId }, include: { patient: true, slot: true } })
  if (!appt) return err('Not found', 404)

  const now = new Date()
  const slotStart = appt.start
  const slotEnd = appt.end
  const grace = 10 * 60 * 1000 // 10 min grace
  let newStatus: 'completed' | 'late_no_show' = 'completed'
  let lateBy = 0

  if (now > slotEnd) {
    // Arrived after slot end — late_no_show
    newStatus = 'late_no_show'
  } else if (now > new Date(slotStart.getTime() + grace)) {
    lateBy = Math.floor((now.getTime() - slotStart.getTime()) / (60 * 1000))
  }

  await db.appointment.update({
    where: { id },
    data: { status: newStatus, checkInTime: now, paymentStatus: appt.paymentMode === 'cash' ? 'paid' : appt.paymentStatus },
  })

  // Increment patient visit count
  if (newStatus === 'completed') {
    await db.patient.update({ where: { id: appt.patientId }, data: { totalVisits: { increment: 1 } } })
  }

  // ── Referral reward handling ──
  const referralEvent = await db.referralEvent.findUnique({
    where: { appointmentId: id },
    include: { referrer: { select: { id: true, phone: true } }, referralCode: { include: { patient: { select: { phone: true } } } } },
  })

  if (referralEvent && referralEvent.status === 'booked') {
    if (newStatus === 'completed') {
      await db.referralEvent.update({
        where: { id: referralEvent.id },
        data: { status: 'completed', rewardStatus: 'earned', completedAt: now },
      })

      // Credit referrer
      if (referralEvent.rewardAmount > 0) {
        await db.patient.update({
          where: { id: referralEvent.referrerPatientId },
          data: { rewardBalance: { increment: referralEvent.rewardAmount } },
        })
      }

      // WhatsApp notification to referrer
      const referrerPhone = referralEvent.referralCode.patient.phone
      if (referrerPhone) {
        sendWhatsAppMessage(clinicId, referrerPhone,
          `🎉 Mubarak ho! Aapke refer kiye gaye patient ki appointment complete ho gayi hai. Rs ${referralEvent.rewardAmount} credit aapke account me add kar diya gaya hai. Agli appointment par ye credit automatically apply ho jayega.`
        ).catch(() => {})
      }
    } else if (newStatus === 'late_no_show') {
      await db.referralEvent.update({
        where: { id: referralEvent.id },
        data: { status: 'no_show', rewardStatus: 'void' },
      })
    }
  }

  // Update current token (advance to this patient's token)
  if (appt.slot?.tokenNo) {
    await store.setCurrentToken(clinicId, appt.doctorId, appt.slot.tokenNo)
  }
  await store.publish(`clinic:${clinicId}:queue`, { type: 'patient_checked_in', appointmentId: id, doctorId: appt.doctorId, status: newStatus })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'patient_checked_in', target: id, metadata: { lateBy, status: newStatus } })

  return ok({ status: newStatus, lateBy })
}

export const POST = handle(checkIn)
