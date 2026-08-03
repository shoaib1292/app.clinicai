/**
 * GET /api/patient/clinics/[id]/doctors
 * List active doctors for a clinic.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePatientAuth } from '@/lib/patient-session'
import { ok, err, handle } from '@/lib/api'

async function list(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clinicId } = await params
  await requirePatientAuth(req)

  const doctors = await db.doctor.findMany({
    where: { clinicId, active: true },
    select: { id: true, name: true, speciality: true, gender: true, currentStatus: true, slotDurationMin: true, canTelemedicine: true },
    orderBy: { name: 'asc' },
  })

  return ok(doctors)
}

export const GET = handle(list)
