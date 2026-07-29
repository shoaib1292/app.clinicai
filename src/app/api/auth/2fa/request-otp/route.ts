import { NextRequest } from 'next/server'
import { generateOTP, storeOTP, checkOTPRateLimit, sendWhatsAppOTP, getMaskedPhone } from '@/lib/otp'
import { verifySession } from '@/lib/auth'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'

interface UserWithPhone {
  phone: string
  clinicId: string | null
}

async function getUserForOtp(userId: string, userType: string): Promise<UserWithPhone | null> {
  switch (userType) {
    case 'platform_admin': {
      const u = await db.platformAdmin.findUnique({ where: { id: userId }, select: { phone: true } })
      return u ? { phone: u.phone || '', clinicId: null } : null
    }
    case 'platform_staff': {
      const u = await db.platformStaff.findUnique({ where: { id: userId }, select: { phone: true } })
      return u ? { phone: u.phone || '', clinicId: null } : null
    }
    case 'clinic_admin': {
      const u = await db.clinicAdmin.findUnique({ where: { id: userId }, select: { phone: true, clinicId: true } })
      return u ? { phone: u.phone || '', clinicId: u.clinicId } : null
    }
    default:
      return null
  }
}

async function requestOtp(req: NextRequest) {
  const body = (await req.json()) as { pendingToken?: string }

  // Support two flows: pending 2FA cookie OR body token
  let pendingToken = req.cookies.get('clinicsai_2fa_pending')?.value
  if (!pendingToken && body.pendingToken) {
    pendingToken = body.pendingToken
  }

  if (!pendingToken) {
    return err('2FA session not found. Please login again.', 401)
  }

  const pending = verifySession(pendingToken)
  if (!pending) return err('2FA session expired. Please login again.', 401)

  if (pending.twoFactorVerified) {
    return err('Already verified', 400)
  }

  // Rate limit
  const allowed = await checkOTPRateLimit(pending.sub)
  if (!allowed) {
    return err('Too many OTP requests. Please wait 5 minutes.', 429)
  }

  // Get user's phone
  const user = await getUserForOtp(pending.sub, pending.type)
  if (!user || !user.phone) {
    return err('No phone number on file. Please use authenticator app instead.', 400)
  }

  // Check user's 2FA method
  let twoFactorMethod = 'totp'
  if (pending.type === 'platform_admin') {
    const admin = await db.platformAdmin.findUnique({ where: { id: pending.sub }, select: { twoFactorMethod: true } })
    twoFactorMethod = admin?.twoFactorMethod || 'totp'
  } else if (pending.type === 'platform_staff') {
    const staff = await db.platformStaff.findUnique({ where: { id: pending.sub }, select: { twoFactorMethod: true } })
    twoFactorMethod = staff?.twoFactorMethod || 'totp'
  } else if (pending.type === 'clinic_admin') {
    const cadmin = await db.clinicAdmin.findUnique({ where: { id: pending.sub }, select: { twoFactorMethod: true } })
    twoFactorMethod = cadmin?.twoFactorMethod || 'totp'
  }

  if (twoFactorMethod !== 'whatsapp') {
    return err('WhatsApp OTP is not enabled. Use authenticator app.', 400)
  }

  // If this is a platform admin/staff (no clinicId), we need a fallback
  // Super admins use the first connected clinic's WhatsApp
  if (!user.clinicId) {
    const firstConn = await db.whatsAppConnection.findFirst({
      where: { status: 'connected' },
      orderBy: { createdAt: 'desc' },
    })
    if (!firstConn) {
      return err('No WhatsApp connection available', 503)
    }
    ;(user as any).clinicId = firstConn.clinicId
  }

  const code = generateOTP()
  await storeOTP(pending.sub, user.phone, code)

  const result = await sendWhatsAppOTP(user.phone, user.clinicId!, code)
  if (!result.ok) {
    return err(`Failed to send WhatsApp message: ${result.error || 'Unknown error'}`, 500)
  }

  return ok({
    sent: true,
    channel: 'whatsapp',
    maskedPhone: getMaskedPhone(user.phone),
    attemptsRemaining: 0,
  })
}

export const POST = handle(requestOtp)
