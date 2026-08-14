/**
 * GET /api/patient/clinics/[id]/token
 * Returns live token/queue position for the patient's active appointment.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { requirePatientAuth } from '@/lib/patient-session'
import { ok, err, handle } from '@/lib/api'

async function getToken(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clinicId } = await params
  const { appUserId } = await requirePatientAuth(req)

  // Find patient's active (booked/checked-in) appointment for today
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const patient = await db.patient.findFirst({
    where: { appUserId, clinicId },
    select: { id: true },
  })

  if (!patient) return ok({ token: null, status: 'no_appointment' })

  const appt = await db.appointment.findFirst({
    where: {
      clinicId,
      patientId: patient.id,
      status: { in: ['booked', 'confirmed', 'in_call', 'completed'] },
      start: { gte: startOfDay, lt: endOfDay },
    },
    select: {
      id: true,
      start: true,
      status: true,
      slot: { select: { tokenNo: true } },
      doctor: { select: { id: true, name: true } },
    },
    orderBy: { start: 'asc' },
  })

  if (!appt) return ok({ token: null, status: 'no_appointment' })

  // Get current serving token from store
  const currentToken = await store.getCurrentToken(clinicId, appt.doctor.id)

  return ok({
    token: appt.slot?.tokenNo || null,
    currentToken,
    status: appt.status,
    doctorName: appt.doctor.name,
    estimatedWait: appt.slot?.tokenNo && currentToken
      ? Math.max(0, (appt.slot.tokenNo - currentToken) * 5) // rough: 5 min per patient
      : null,
    appointmentStart: appt.start,
    queuePosition: appt.slot?.tokenNo ? Math.max(0, (appt.slot.tokenNo - currentToken)) : null,
  })
}

export const GET = handle(getToken)
