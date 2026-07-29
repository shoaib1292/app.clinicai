/**
 * POST /api/auth/change-password
 *
 * Allows authenticated users to change their password.
 * Requires: currentPassword + newPassword
 * Validates current password before updating.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { requireAuth, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
}

async function changePassword(req: NextRequest) {
  const session = await requireAuth()
  const body = (await req.json()) as ChangePasswordBody
  const { currentPassword, newPassword } = body

  if (!currentPassword) return err('Current password is required', 400)
  if (!newPassword) return err('New password is required', 400)
  if (newPassword.length < 8) return err('New password must be at least 8 characters', 400)
  if (currentPassword === newPassword) return err('New password must be different from current password', 400)

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

  // Find user and verify current password based on type
  let passwordHash = ''
  switch (session.type) {
    case 'platform_admin': {
      const user = await db.platformAdmin.findUnique({ where: { id: session.sub } })
      if (!user) return err('User not found', 404)
      const valid = await verifyPassword(currentPassword, user.passwordHash)
      if (!valid) return err('Current password is incorrect', 401)
      passwordHash = await hashPassword(newPassword)
      await db.platformAdmin.update({ where: { id: session.sub }, data: { passwordHash } })
      break
    }
    case 'platform_staff': {
      const user = await db.platformStaff.findUnique({ where: { id: session.sub } })
      if (!user) return err('User not found', 404)
      const valid = await verifyPassword(currentPassword, user.passwordHash)
      if (!valid) return err('Current password is incorrect', 401)
      passwordHash = await hashPassword(newPassword)
      await db.platformStaff.update({ where: { id: session.sub }, data: { passwordHash } })
      break
    }
    case 'clinic_admin': {
      const user = await db.clinicAdmin.findUnique({ where: { id: session.sub } })
      if (!user) return err('User not found', 404)
      const valid = await verifyPassword(currentPassword, user.passwordHash)
      if (!valid) return err('Current password is incorrect', 401)
      passwordHash = await hashPassword(newPassword)
      await db.clinicAdmin.update({ where: { id: session.sub }, data: { passwordHash } })
      break
    }
    case 'receptionist': {
      const user = await db.receptionist.findUnique({ where: { id: session.sub } })
      if (!user) return err('User not found', 404)
      const valid = await verifyPassword(currentPassword, user.passwordHash)
      if (!valid) return err('Current password is incorrect', 401)
      passwordHash = await hashPassword(newPassword)
      await db.receptionist.update({ where: { id: session.sub }, data: { passwordHash } })
      break
    }
    case 'doctor': {
      const user = await db.doctor.findUnique({ where: { id: session.sub } })
      if (!user) return err('User not found', 404)
      if (!user.passwordHash) return err('Doctor account not configured for login', 400)
      const valid = await verifyPassword(currentPassword, user.passwordHash)
      if (!valid) return err('Current password is incorrect', 401)
      passwordHash = await hashPassword(newPassword)
      await db.doctor.update({ where: { id: session.sub }, data: { passwordHash } })
      break
    }
    default:
      return err('Unknown user type', 400)
  }

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'change_password',
    ip,
  })

  return ok({ message: 'Password changed successfully.' })
}

export const POST = handle(changePassword)
