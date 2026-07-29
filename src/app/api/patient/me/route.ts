/**
 * GET /api/patient/me
 * Returns patient profile + attached clinic list.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePatientAuth } from '@/lib/patient-session'
import { ok, err, handle } from '@/lib/api'

async function me(req: NextRequest) {
  const { appUserId } = await requirePatientAuth(req)

  const appUser = await db.patientAppUser.findUnique({ where: { id: appUserId } })
  if (!appUser) return err('User not found', 404)

  const patients = await db.patient.findMany({
    where: { appUserId },
    select: {
      id: true,
      clinic: { select: { id: true, name: true, slug: true, city: true, logoUrl: true } },
    },
  })

  return ok({
    appUserId: appUser.id,
    phone: appUser.phone,
    clinics: patients.map((p) => p.clinic),
  })
}

export const GET = handle(me)
