import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { decryptPhone } from '@/lib/phone-encryption'
import { ok, err, handle } from '@/lib/api'

// GET /api/patients/[id] — detail with family + recent appointments
async function getPatient(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params
  const patient = await db.patient.findFirst({
    where: { id, clinicId },
    include: {
      familyMembers: true,
      appointments: {
        orderBy: { start: 'desc' },
        take: 20,
        include: { doctor: { select: { id: true, name: true, speciality: true } }, service: { select: { name: true } } },
      },
      _count: { select: { conversations: true } },
    },
  })
  if (!patient) return err('Patient not found', 404)
  return ok({ ...patient, phone: decryptPhone(patient.phone) })
}

export const GET = handle(getPatient)
