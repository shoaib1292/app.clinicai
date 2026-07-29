import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { maskPhone } from '@/lib/phone-encryption'

// GET /api/patients/[id]/appointments — all appointments for a specific patient
async function list(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params

  const patient = await db.patient.findFirst({ where: { id, clinicId } })
  if (!patient) return err('Patient not found', 404)

  const appointments = await db.appointment.findMany({
    where: { patientId: id, clinicId },
    orderBy: { start: 'desc' },
    include: {
      doctor: { select: { id: true, name: true, speciality: true } },
      service: { select: { name: true } },
    },
  })

  // Decrypt patient phone
  const data = appointments.map((a: any) => ({
    ...a,
    patient: a.patient ? { ...a.patient, phone: maskPhone(String(a.patient.phone ?? '')) } : undefined,
  }))

  return ok(data)
}

export const GET = handle(list)
