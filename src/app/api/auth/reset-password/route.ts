/**
 * POST /api/auth/reset-password
 *
 * Completes password reset flow.
 * 1. Validates reset token from in-memory store
 * 2. Hashes new password
 * 3. Updates the user's passwordHash in the appropriate table
 * 4. Invalidates the token
 * 5. Returns success
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { hashPassword } from '@/lib/auth'
import { auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { getInviteData, consumeInvite } from '@/lib/staff-invite'

interface ResetPasswordBody {
  token: string
  password: string
}

async function resetPassword(req: NextRequest) {
  const body = (await req.json()) as ResetPasswordBody
  const { token, password } = body

  if (!token) return err('Reset token is required', 400)
  if (!password) return err('New password is required', 400)
  if (password.length < 8) return err('Password must be at least 8 characters', 400)

  // Validate reset token (either password-reset or staff-invite)
  const key = `password-reset:${token}`
  const resetData = await store.get<{ userId: string; userType: string; email: string }>(key)
  const inviteData = resetData ? null : await getInviteData(token)
  const data = resetData || inviteData
  if (!data) return err('Invalid or expired reset token', 400)

  const { userId, userType, email } = data

  // Hash the new password
  const passwordHash = await hashPassword(password)

  // Update the appropriate user table based on userType
  let updated = false
  switch (userType) {
    case 'platform_admin': {
      const user = await db.platformAdmin.findUnique({ where: { id: userId } })
      if (user && user.email === email) {
        await db.platformAdmin.update({ where: { id: userId }, data: { passwordHash } })
        updated = true
      }
      break
    }
    case 'platform_staff': {
      const user = await db.platformStaff.findUnique({ where: { id: userId } })
      if (user && user.email === email) {
        await db.platformStaff.update({ where: { id: userId }, data: { passwordHash } })
        updated = true
      }
      break
    }
    case 'clinic_admin': {
      const user = await db.clinicAdmin.findUnique({ where: { id: userId } })
      if (user && user.email === email) {
        await db.clinicAdmin.update({ where: { id: userId }, data: { passwordHash } })
        updated = true
      }
      break
    }
    case 'receptionist': {
      const user = await db.receptionist.findUnique({ where: { id: userId } })
      if (user && user.email === email) {
        await db.receptionist.update({ where: { id: userId }, data: { passwordHash, emailVerified: new Date() } })
        updated = true
      }
      break
    }
    case 'doctor': {
      const user = await db.doctor.findUnique({ where: { id: userId } })
      if (user && user.email === email) {
        await db.doctor.update({ where: { id: userId }, data: { passwordHash, emailVerified: new Date() } })
        updated = true
      }
      break
    }
    case 'pharmacist': {
      const user = await db.pharmacist.findUnique({ where: { id: userId } })
      if (user && user.email === email) {
        await db.pharmacist.update({ where: { id: userId }, data: { passwordHash, emailVerified: new Date() } })
        updated = true
      }
      break
    }
    case 'lab_admin': {
      const user = await db.labAdmin.findUnique({ where: { id: userId } })
      if (user && user.email === email) {
        await db.labAdmin.update({ where: { id: userId }, data: { passwordHash, emailVerified: new Date() } })
        updated = true
      }
      break
    }
    case 'accountant': {
      const user = await db.accountant.findUnique({ where: { id: userId } })
      if (user && user.email === email) {
        await db.accountant.update({ where: { id: userId }, data: { passwordHash, emailVerified: new Date() } })
        updated = true
      }
      break
    }
    default:
      return err('Invalid user type', 400)
  }

  if (!updated) return err('User not found or email mismatch', 404)

  // Invalidate token (delete from store)
  await store.del(key)
  if (inviteData) await consumeInvite(token)

  // Audit log
  await auditLog({
    actorId: userId,
    actorType: userType as any,
    action: 'password_reset',
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ message: 'Password has been reset successfully. You can now login with your new password.' })
}

export const POST = handle(resetPassword)
