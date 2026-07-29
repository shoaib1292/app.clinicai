import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { verifyTOTP, decrypt, verifyBackupCode } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'

interface PendingSetup {
  secret: string
  backupCodes: string[]
  createdAt: number
}

/**
 * Verify a TOTP code to complete 2FA setup.
 * The user scans the QR, enters the 6-digit code from their authenticator app,
 * and we verify it against the pending secret. If correct, 2FA is enabled.
 */
async function verify2FA(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  const body = (await req.json()) as { code: string; useBackupCode?: boolean }
  if (!body.code) return err('code required', 400)

  // Fetch user record with pending setup data
  let user: { id: string; twoFactorPendingSetup: string | null; twoFactorSecret: string | null; twoFactorBackupCodes: string | null } | null = null
  if (session.type === 'platform_admin') {
    user = await db.platformAdmin.findUnique({ where: { id: session.sub }, select: { id: true, twoFactorPendingSetup: true, twoFactorSecret: true, twoFactorBackupCodes: true } })
  } else if (session.type === 'clinic_admin') {
    user = await db.clinicAdmin.findUnique({ where: { id: session.sub }, select: { id: true, twoFactorPendingSetup: true, twoFactorSecret: true, twoFactorBackupCodes: true } })
  } else if (session.type === 'platform_staff') {
    user = await db.platformStaff.findUnique({ where: { id: session.sub }, select: { id: true, twoFactorPendingSetup: true, twoFactorSecret: true, twoFactorBackupCodes: true } })
  }

  if (!user) return err('User not found', 404)

  // Check if this is a setup verification or a login verification
  if (user.twoFactorPendingSetup) {
    // SETUP VERIFICATION: verify code against pending secret
    const setupData: PendingSetup = JSON.parse(decrypt(user.twoFactorPendingSetup))
    if (Date.now() - setupData.createdAt > 10 * 60 * 1000) {
      return err('Setup expired. Please start again.', 400)
    }

    if (body.useBackupCode) {
      return err('Backup codes cannot be used during setup', 400)
    }

    if (!verifyTOTP(body.code, setupData.secret)) {
      return err('Invalid code. Please try again.', 400)
    }

    // Enable 2FA: store encrypted secret + hashed backup codes
    const { encrypt } = await import('@/lib/auth')
    const encryptedSecret = encrypt(setupData.secret)
    const backupCodesJson = JSON.stringify(setupData.backupCodes)

    if (session.type === 'platform_admin') {
      await db.platformAdmin.update({
        where: { id: session.sub },
        data: {
          twoFactorSecret: encryptedSecret,
          twoFactorBackupCodes: backupCodesJson,
          twoFactorEnabled: true,
          twoFactorPendingSetup: null,
        },
      })
    } else if (session.type === 'clinic_admin') {
      await db.clinicAdmin.update({
        where: { id: session.sub },
        data: {
          twoFactorSecret: encryptedSecret,
          twoFactorBackupCodes: backupCodesJson,
          twoFactorEnabled: true,
          twoFactorPendingSetup: null,
        },
      })
    } else if (session.type === 'platform_staff') {
      await db.platformStaff.update({
        where: { id: session.sub },
        data: {
          twoFactorSecret: encryptedSecret,
          twoFactorBackupCodes: backupCodesJson,
          twoFactorEnabled: true,
          twoFactorPendingSetup: null,
        },
      })
    }

    return ok({ enabled: true, message: '2FA enabled successfully' })
  }

  // LOGIN VERIFICATION: verify code against stored secret
  if (!user.twoFactorSecret || !user.twoFactorEnabled) {
    return err('2FA not set up for this account', 400)
  }

  const secret = decrypt(user.twoFactorSecret)

  if (body.useBackupCode) {
    // Verify backup code
    const backupCodes: string[] = user.twoFactorBackupCodes ? JSON.parse(user.twoFactorBackupCodes) : []
    const idx = verifyBackupCode(body.code, backupCodes)
    if (idx === -1) {
      return err('Invalid backup code', 400)
    }
    // Remove used backup code
    backupCodes.splice(idx, 1)
    if (session.type === 'platform_admin') {
      await db.platformAdmin.update({ where: { id: session.sub }, data: { twoFactorBackupCodes: JSON.stringify(backupCodes) } })
    } else if (session.type === 'clinic_admin') {
      await db.clinicAdmin.update({ where: { id: session.sub }, data: { twoFactorBackupCodes: JSON.stringify(backupCodes) } })
    } else if (session.type === 'platform_staff') {
      await db.platformStaff.update({ where: { id: session.sub }, data: { twoFactorBackupCodes: JSON.stringify(backupCodes) } })
    }
    return ok({ verified: true, remainingCodes: backupCodes.length })
  }

  if (!verifyTOTP(body.code, secret)) {
    return err('Invalid code', 400)
  }

  return ok({ verified: true })
}

export const POST = handle(verify2FA)
