/**
 * POST /api/auth/forgot-password
 *
 * Initiates password reset flow.
 * 1. Accepts email
 * 2. Finds user across all user types (platform_admin, platform_staff, clinic_admin, receptionist, doctor)
 * 3. Generates a reset token (stored in-memory store, 1hr TTL)
 * 4. In sandbox logs the reset link; in production sends email
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { randomToken } from '@/lib/auth'
import { sendEmail, templatePasswordReset } from '@/lib/notifications'
import { ok, err, handle } from '@/lib/api'

const RESET_TOKEN_TTL = 3600 // 1 hour

interface ForgotPasswordBody {
  email: string
}

async function forgotPassword(req: NextRequest) {
  const body = (await req.json()) as ForgotPasswordBody
  const email = body.email?.toLowerCase().trim()
  if (!email) return err('Email is required', 400)

  // Search across all user types
  const [admin, staff, cadmin, rec, doc, pharm, lab, acct] = await Promise.all([
    db.platformAdmin.findUnique({ where: { email }, select: { id: true, name: true, email: true } }),
    db.platformStaff.findUnique({ where: { email }, select: { id: true, name: true, email: true } }),
    db.clinicAdmin.findUnique({ where: { email }, select: { id: true, name: true, email: true } }),
    db.receptionist.findUnique({ where: { email }, select: { id: true, name: true, email: true } }),
    db.doctor.findFirst({ where: { email }, select: { id: true, name: true, email: true } }),
    db.pharmacist.findUnique({ where: { email }, select: { id: true, name: true, email: true } }),
    db.labAdmin.findUnique({ where: { email }, select: { id: true, name: true, email: true } }),
    db.accountant.findUnique({ where: { email }, select: { id: true, name: true, email: true } }),
  ])

  const user = admin || staff || cadmin || rec || doc || pharm || lab || acct
  if (!user) {
    // Don't reveal whether the email exists — security best practice
    return ok({ message: 'If an account with that email exists, a reset link has been sent.' })
  }

  // Determine user type for token
  let userType = ''
  if (admin) userType = 'platform_admin'
  else if (staff) userType = 'platform_staff'
  else if (cadmin) userType = 'clinic_admin'
  else if (rec) userType = 'receptionist'
  else if (doc) userType = 'doctor'
  else if (pharm) userType = 'pharmacist'
  else if (lab) userType = 'lab_admin'
  else if (acct) userType = 'accountant'

  // Generate reset token
  const token = randomToken(24)
  const key = `password-reset:${token}`
  await store.set(key, { userId: user.id, userType, email: user.email }, RESET_TOKEN_TTL)

  // Build reset URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // In sandbox, log the link
  const emailConfigured = !!(process.env.BREVO_API_KEY)
  if (!emailConfigured) {
    console.log(`[forgot-password] Reset link for ${email}: ${resetUrl}`)
  }

  // Send email with reset link
  if (user.email) {
    try {
      const tpl = templatePasswordReset({ name: user.name || undefined, resetUrl })
      await sendEmail(user.email, tpl.subject, tpl.html, `Reset your ClinicAI password: ${resetUrl}`)
    } catch (e) {
      console.error('[forgot-password] Email send failed:', e)
      // Don't reveal email failure to user
    }
  }

  return ok({ message: 'If an account with that email exists, a reset link has been sent.' })
}

export const POST = handle(forgotPassword)
