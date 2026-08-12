import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePatientAuth } from '@/lib/patient-session'
import { getOrCreateReferralCode } from '@/lib/discounts'
import { ok, err, handle } from '@/lib/api'

async function getCode(req: NextRequest) {
  const { appUserId } = await requirePatientAuth(req)

  const body = await req.json().catch(() => ({}))
  const { clinicId } = body as { clinicId?: string }

  if (!clinicId) return err('clinicId is required', 400)

  const appUser = await db.patientAppUser.findUnique({ where: { id: appUserId } })
  if (!appUser) return err('Patient not found', 404)

  const patient = await db.patient.findFirst({ where: { appUserId, clinicId } })
  if (!patient) return err('You are not registered at this clinic', 404)

  const result = await getOrCreateReferralCode(clinicId, patient.id)
  return ok(result)
}

export const POST = handle(getCode)
