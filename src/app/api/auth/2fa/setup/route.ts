import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { generateTOTPSecret, generateTOTPUri, generateBackupCodes, hashBackupCode, encrypt } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'
import QRCode from 'qrcode'

/**
 * Setup 2FA for the current user (generates TOTP secret + QR code + backup codes).
 * Per founder doc §33: 2FA mandatory for Platform Admin, Clinic Admin, Finance staff.
 */
async function setup2FA(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  // Generate TOTP secret
  const secret = generateTOTPSecret()
  const otpauthUri = generateTOTPUri(secret, session.email)

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { width: 256, margin: 2 })

  // Generate backup codes (8 single-use codes)
  const backupCodes = generateBackupCodes()
  const hashedBackupCodes = backupCodes.map(hashBackupCode)

  // Store encrypted secret + hashed backup codes temporarily (pending verification)
  // We don't enable 2FA until the user verifies with a TOTP code
  const setupData = {
    secret,
    backupCodes: hashedBackupCodes,
    createdAt: Date.now(),
  }

  // Store in DB based on user type
  const encryptedSetupData = encrypt(JSON.stringify(setupData))
  if (session.type === 'platform_admin') {
    await db.platformAdmin.update({
      where: { id: session.sub },
      data: { twoFactorPendingSetup: encryptedSetupData },
    })
  } else if (session.type === 'clinic_admin') {
    await db.clinicAdmin.update({
      where: { id: session.sub },
      data: { twoFactorPendingSetup: encryptedSetupData },
    })
  } else if (session.type === 'platform_staff') {
    await db.platformStaff.update({
      where: { id: session.sub },
      data: { twoFactorPendingSetup: encryptedSetupData },
    })
  }

  return ok({
    qrCode: qrDataUrl,
    otpauthUri,
    backupCodes, // Show once — user must save these
    secret, // Show for manual entry
  })
}

export const POST = handle(setup2FA)
