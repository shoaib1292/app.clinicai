/**
 * POST /api/patient/portal/logout
 * Patient session cookie clear karta hai.
 */
import { NextRequest } from 'next/server'
import { PATIENT_SESSION_COOKIE } from '@/lib/patient-cookie-session'
import { ok, handle } from '@/lib/api'

async function logout(_req: NextRequest) {
  const res = ok({ ok: true })
  res.cookies.set(PATIENT_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}

export const POST = handle(logout)
