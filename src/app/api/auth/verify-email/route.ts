/**
 * GET /api/auth/verify-email?token=xxx
 * POST /api/auth/verify-email { token: "xxx" }
 *
 * Verifies a clinic admin's email via token from signup.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

async function verifyEmail(req: NextRequest) {
  let token: string | null = null

  if (req.method === 'GET') {
    token = req.nextUrl.searchParams.get('token')
  } else {
    try {
      const body = await req.json()
      token = body.token?.trim()
    } catch {
      return err('Invalid request', 400)
    }
  }

  if (!token) return err('Token is required', 400)

  const key = `email-verify:${token}`
  const data = await store.get<{ userId: string; userType: string; email: string }>(key)
  if (!data) return err('Invalid or expired verification link', 400)

  if (data.userType !== 'clinic_admin') {
    return err('Unsupported user type for email verification', 400)
  }

  await db.clinicAdmin.update({
    where: { id: data.userId },
    data: { emailVerified: new Date() },
  })

  await store.del(key)

  return ok({ verified: true, email: data.email })
}

export const GET = handle(verifyEmail)
export const POST = handle(verifyEmail)

