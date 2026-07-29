import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPhone } from '@/lib/auth'
import { PATIENT_SESSION_COOKIE } from '@/lib/patient-cookie-session'
import { createPatientSession } from '@/lib/patient-session'
import { ok, err, handle } from '@/lib/api'

async function verify(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { token?: string }
  const { token } = body
  if (!token) return err('token is required', 400)

  const link = await db.patientMagicLink.findUnique({ where: { token } })
  if (!link) return err('Invalid or expired link', 404)
  if (link.used) return err('Link already used', 410)
  if (new Date() > link.expiresAt) return err('Link expired', 410)

  await db.patientMagicLink.update({
    where: { id: link.id },
    data: { used: true },
  })

  const appUser = await db.patientAppUser.findUnique({ where: { id: link.appUserId } })
  if (!appUser) return err('Patient not found', 404)

  const phoneHash = hashPhone(appUser.phone)
  const jwt = await createPatientSession(appUser.id, phoneHash)

  // Set persistent cookie so patient stays logged in across sessions
  const res = NextResponse.json({
    ok: true,
    data: { token: jwt, appUserId: appUser.id, clinicId: link.clinicId },
  })

  res.cookies.set(PATIENT_SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 3600,
  })

  return res
}

export const POST = handle(verify)
