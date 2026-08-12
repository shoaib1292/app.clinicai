/**
 * Staff invitation helper — sends a password-setup email with a generous TTL.
 * Used when clinic admin adds doctors/receptionists/pharmacists/lab-admins/accountants.
 */
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { randomToken } from '@/lib/auth'
import { sendEmail, templateStaffInvite } from '@/lib/notifications'

// Invitation links stay valid for 7 days — staff may not check email immediately.
export const INVITE_TTL_SECONDS = 7 * 24 * 3600

interface InviteUser {
  id: string
  name: string
  email: string
  userType: 'doctor' | 'receptionist' | 'pharmacist' | 'lab_admin' | 'accountant'
}

export async function sendStaffInvite(user: InviteUser, clinicName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = randomToken(24)
    const key = `staff-invite:${token}`
    await store.set(key, { userId: user.id, userType: user.userType, email: user.email }, INVITE_TTL_SECONDS)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinicai.pk'
    const setupUrl = `${baseUrl}/reset-password?token=${token}`

    // Sandbox: log the link so devs can test without SMTP.
    const emailConfigured = !!process.env.BREVO_API_KEY
    if (!emailConfigured) {
      console.log(`[staff-invite] Setup link for ${user.email}: ${setupUrl}`)
    }

    const tpl = templateStaffInvite({ name: user.name, clinicName, setupUrl })
    await sendEmail(user.email, tpl.subject, tpl.html, `Set up your ClinicAI password: ${setupUrl}`)
    return { ok: true }
  } catch (e) {
    console.error('[staff-invite] Email send failed:', e)
    return { ok: false, error: String(e) }
  }
}

// Used by reset-password to validate invitation tokens as well.
export async function getInviteData(token: string) {
  return store.get<{ userId: string; userType: string; email: string }>(`staff-invite:${token}`)
}

export async function consumeInvite(token: string) {
  await store.del(`staff-invite:${token}`)
}

export async function getClinicNameForUser(userType: string, clinicId: string): Promise<string> {
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } })
  return clinic?.name || 'your clinic'
}
