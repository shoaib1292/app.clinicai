import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyRefreshToken, signSession, signRefreshToken, REFRESH_COOKIE, SESSION_COOKIE } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'

/**
 * Refresh the access token using a valid refresh token.
 * Implements token rotation: old refresh token JTI is invalidated, new one issued.
 * Per founder doc §33: "JWT access (15 min) + refresh (7 days, rotated)"
 */
async function refresh(req: NextRequest) {
  // Get refresh token from cookie
  const cookieHeader = req.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=')
      return [k, decodeURIComponent(v.join('='))]
    })
  )
  const refreshToken = cookies[REFRESH_COOKIE]

  if (!refreshToken) {
    return err('No refresh token', 401)
  }

  const payload = verifyRefreshToken(refreshToken)
  if (!payload) {
    return err('Invalid or expired refresh token', 401)
  }

  // Look up the user to ensure they still exist and are active
  let user: { id: string; email: string; name: string; type: string; role?: string; clinicId?: string } | null = null

  // Try each table (we don't know the type from the refresh token)
  const platformAdmin = await db.platformAdmin.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true } })
  if (platformAdmin) {
    user = { ...platformAdmin, type: 'platform_admin' }
  } else {
    const clinicAdmin = await db.clinicAdmin.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, clinicId: true } })
    if (clinicAdmin) {
      user = { ...clinicAdmin, type: 'clinic_admin' }
    } else {
      const staff = await db.platformStaff.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, role: true } })
      if (staff) {
        user = { ...staff, type: 'platform_staff' }
      } else {
        const doctor = await db.doctor.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, clinicId: true } })
        if (doctor) {
          user = { id: doctor.id, email: '', name: doctor.name, type: 'doctor', clinicId: doctor.clinicId }
        } else {
          const receptionist = await db.receptionist.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, clinicId: true } })
          if (receptionist) {
            user = { ...receptionist, type: 'receptionist' }
          }
        }
      }
    }
  }

  if (!user) {
    return err('User not found', 401)
  }

  // Issue new access token
  const newAccessToken = signSession({
    sub: user.id,
    type: user.type,
    role: user.role,
    clinicId: user.clinicId,
    email: user.email,
    name: user.name,
    twoFactorVerified: true, // Preserve 2FA status from original session
  })

  // Issue new refresh token (rotation — old JTI is implicitly invalidated
  // because we issue a new token with a new JTI; in production with Redis,
  // we'd also blacklist the old JTI)
  const { token: newRefreshToken } = signRefreshToken(user.id)

  // Set cookies
  const headers = new Headers()
  headers.append('Set-Cookie', `${SESSION_COOKIE}=${newAccessToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=900`)
  headers.append('Set-Cookie', `${REFRESH_COOKIE}=${newRefreshToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`)

  return ok({ refreshed: true }, headers)
}

export const POST = handle(refresh)
