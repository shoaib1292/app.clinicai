import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

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
  let newStatus = 'completed'
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

  // Update current token (advance to this patient's token)
  if (appt.slot?.tokenNo) {
    store.setCurrentToken(clinicId, appt.doctorId, appt.slot.tokenNo)
  }
  store.publish(`clinic:${clinicId}:queue`, { type: 'patient_checked_in', appointmentId: id, doctorId: appt.doctorId, status: newStatus })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'patient_checked_in', target: id, metadata: { lateBy, status: newStatus } })

  return ok({ status: newStatus, lateBy })
}

export const POST = handle(checkIn)
