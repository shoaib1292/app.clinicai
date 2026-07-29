import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { verifyTOTP, decrypt } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'

/**
 * Disable 2FA for the current user (requires current TOTP code for verification).
 */
async function disable2FA(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  const body = (await req.json()) as { code: string }
  if (!body.code) return err('code required to disable 2FA', 400)

  let user: { id: string; twoFactorSecret: string | null; twoFactorEnabled: boolean } | null = null
  if (session.type === 'platform_admin') {
    user = await db.platformAdmin.findUnique({ where: { id: session.sub }, select: { id: true, twoFactorSecret: true, twoFactorEnabled: true } })
  } else if (session.type === 'clinic_admin') {
    user = await db.clinicAdmin.findUnique({ where: { id: session.sub }, select: { id: true, twoFactorSecret: true, twoFactorEnabled: true } })
  } else if (session.type === 'platform_staff') {
    user = await db.platformStaff.findUnique({ where: { id: session.sub }, select: { id: true, twoFactorSecret: true, twoFactorEnabled: true } })
  }

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return err('2FA not enabled', 400)
  }

  const secret = decrypt(user.twoFactorSecret)
  if (!verifyTOTP(body.code, secret)) {
    return err('Invalid code — 2FA not disabled', 400)
  }

  if (session.type === 'platform_admin') {
    await db.platformAdmin.update({
      where: { id: session.sub },
      data: { twoFactorSecret: null, twoFactorBackupCodes: null, twoFactorEnabled: false, twoFactorPendingSetup: null },
    })
  } else if (session.type === 'clinic_admin') {
    await db.clinicAdmin.update({
      where: { id: session.sub },
      data: { twoFactorSecret: null, twoFactorBackupCodes: null, twoFactorEnabled: false, twoFactorPendingSetup: null },
    })
  } else if (session.type === 'platform_staff') {
    await db.platformStaff.update({
      where: { id: session.sub },
      data: { twoFactorSecret: null, twoFactorBackupCodes: null, twoFactorEnabled: false, twoFactorPendingSetup: null },
    })
  }

  return ok({ disabled: true })
}

export const POST = handle(disable2FA)
