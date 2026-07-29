/**
 * GET /api/patient/clinics/[id]/history
 * Returns past appointments for a patient at a specific clinic.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePatientAuth } from '@/lib/patient-session'
import { maskPhone } from '@/lib/phone-encryption'
import { ok, err, handle } from '@/lib/api'

async function history(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clinicId } = await params
  const { appUserId } = await requirePatientAuth(req)

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 50)

  const patient = await db.patient.findFirst({
    where: { appUserId, clinicId },
    select: { id: true },
  })

  if (!patient) return ok([])

  const appointments = await db.appointment.findMany({
    where: {
      clinicId,
      patientId: patient.id,
    },
    select: {
      id: true,
      start: true,
      status: true,
      doctor: { select: { name: true, speciality: true } },
      slot: { select: { tokenNo: true, startTime: true } },
      service: { select: { name: true } },
      feedback: { select: { rating: true } },
    },
    orderBy: { start: 'desc' },
    take: limit,
  })

  return ok(appointments)
}

export const GET = handle(history)
