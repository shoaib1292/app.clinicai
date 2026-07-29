/**
 * Patient App Session — JWT create/verify.
 * Separate from clinic-staff sessions. Patient identity = phone number.
 */
import crypto from 'crypto'
import { store } from './store'

const JWT_SECRET = process.env.PATIENT_JWT_SECRET || process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET or PATIENT_JWT_SECRET is required')

const ISSUER = 'clinicai-patient'
const TOKEN_TTL_SEC = 30 * 24 * 3600 // 30 days

function getJwtSecret(): Buffer {
  return Buffer.from(JWT_SECRET.padEnd(64, '0').slice(0, 64), 'utf8')
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Buffer {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64')
}

export interface PatientPayload {
  sub: string       // PatientAppUser.id
  phoneHash: string
  type: 'patient'
  iat: number
  exp: number
}

/**
 * Create a signed JWT for a patient app user.
 * Stored in expo-secure-store on device.
 */
export async function createPatientSession(appUserId: string, phoneHash: string): Promise<string> {
  const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const payload: PatientPayload = {
    sub: appUserId,
    phoneHash,
    type: 'patient',
    iat: now,
    exp: now + TOKEN_TTL_SEC,
  }
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'))
  const hmac = crypto.createHmac('sha256', getJwtSecret())
  hmac.update(`${header}.${body}`)
  const sig = base64UrlEncode(hmac.digest())
  return `${header}.${body}.${sig}`
}

/**
 * Verify and decode a patient JWT. Throws on invalid/expired.
 */
export async function verifyPatientToken(token: string): Promise<PatientPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')

  const [headerB64, bodyB64, sigB64] = parts
  const hmac = crypto.createHmac('sha256', getJwtSecret())
  hmac.update(`${headerB64}.${bodyB64}`)
  const expectedSig = base64UrlEncode(hmac.digest())

  if (!crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) {
    throw new Error('Invalid token signature')
  }

  const payload = JSON.parse(base64UrlDecode(bodyB64).toString('utf8')) as PatientPayload
  if (payload.type !== 'patient') throw new Error('Invalid token type')
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  // Check if token is blacklisted (logout)
  const blacklisted = await store.get(`patient:blacklist:${payload.sub}`)
  if (blacklisted) throw new Error('Token revoked')

  return payload
}

/**
 * Extract patient identity from request Authorization header.
 */
export async function requirePatientAuth(req: Request): Promise<{ appUserId: string; phoneHash: string }> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  if (!token) throw new Error('Missing authorization token')

  const payload = await verifyPatientToken(token)
  return { appUserId: payload.sub, phoneHash: payload.phoneHash }
}

/**
 * Blacklist a patient token on logout.
 */
export async function revokePatientSession(appUserId: string): Promise<void> {
  await store.set(`patient:blacklist:${appUserId}`, '1', TOKEN_TTL_SEC)
}
