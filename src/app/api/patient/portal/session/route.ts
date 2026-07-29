/**
 * GET /api/patient/portal/session
 * Cookie se patient session verify karta hai + API token return karta hai.
 * Portal pages isko call karte hain auto-login ke liye.
 */
import { NextRequest } from 'next/server'
import { getPatientFromCookie } from '@/lib/patient-cookie-session'
import { createPatientSession } from '@/lib/patient-session'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'

async function session(req: NextRequest) {
  const payload = await getPatientFromCookie()
  if (!payload) return err('Not authenticated', 401)

  const appUser = await db.patientAppUser.findUnique({
    where: { id: payload.sub },
  })
  if (!appUser) return err('User not found', 404)

  const patients = await db.patient.findMany({
    where: { appUserId: appUser.id },
    select: {
      id: true,
      clinic: { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
    },
  })

  // Generate fresh JWT for client-side API calls
  const token = await createPatientSession(appUser.id, payload.phoneHash)

  return ok({
    token,
    appUserId: appUser.id,
    phone: appUser.phone,
    clinics: patients.map((p) => ({ ...p.clinic, patientId: p.id })),
  })
}

export const GET = handle(session)
