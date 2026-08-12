/**
 * POST /api/auth/resend-verification
 *
 * Resends the email-verification email for a newly signed-up clinic admin.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { randomToken } from '@/lib/auth'
import { sendEmail, templateEmailVerify } from '@/lib/notifications'
import { ok, err, handle } from '@/lib/api'

async function resend(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = body.email?.toLowerCase().trim()
  if (!email) return err('Email is required', 400)

  const admin = await db.clinicAdmin.findUnique({ where: { email } })
  if (!admin) return ok({ message: 'If an account with that email exists, a verification email has been sent.' })

  // Already verified? Nothing to do.
  if (admin.emailVerified) return ok({ message: 'This email is already verified. You can log in.' })

  const verifyToken = randomToken(24)
  await store.set(`email-verify:${verifyToken}`, { userId: admin.id, userType: 'clinic_admin', email }, 86400) // 24 hours

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinicai.pk'
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`

  try {
    const tpl = templateEmailVerify({ name: admin.name, verifyUrl })
    await sendEmail(email, tpl.subject, tpl.html, `Verify your ClinicAI email: ${verifyUrl}`)
  } catch (e) {
    console.error('[resend-verification] Email send failed:', e)
  }

  return ok({ message: 'Verification email sent.' })
}

export const POST = handle(resend)
