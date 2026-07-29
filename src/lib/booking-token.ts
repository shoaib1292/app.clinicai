import crypto from 'crypto'

const BOOKING_SECRET = process.env.BOOKING_TOKEN_SECRET || process.env.JWT_SECRET || 'booking-token-dev-secret'

interface BookingTokenPayload {
  clinicId: string
  doctorId?: string
  serviceId?: string
  exp: number
}

export function generateBookingToken(clinicId: string, doctorId?: string, serviceId?: string, expiresInDays = 30): string {
  const payload: BookingTokenPayload = {
    clinicId,
    doctorId,
    serviceId,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60,
  }

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', BOOKING_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url')

  return `${header}.${body}.${signature}`
}

export function verifyBookingToken(token: string): BookingTokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      // Legacy: try base64 format (clinicId:doctorId:serviceId)
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8')
        const legacyParts = decoded.split(':')
        return {
          clinicId: legacyParts[0] || '',
          doctorId: legacyParts[1] || undefined,
          serviceId: legacyParts[2] || undefined,
          exp: 0,
        }
      } catch {
        return null
      }
    }

    const [headerB64, bodyB64, sigB64] = parts
    const expectedSig = crypto
      .createHmac('sha256', BOOKING_SECRET)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url')

    if (expectedSig !== sigB64) return null

    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString()) as BookingTokenPayload

    if (payload.exp > 0 && payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}
