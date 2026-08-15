import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { authenticator } from 'otplib'
import { NextRequest } from 'next/server'

export function cookieSecure(req: NextRequest): boolean {
  return req.headers.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production'
}

// AES-256-GCM encryption for secrets at rest (LLM keys, Meta tokens, bank accounts)
let KEY_BUFFER: Buffer | null = null

function getKeyBuffer(): Buffer {
  if (!KEY_BUFFER) {
    const encKey = process.env.APP_ENCRYPTION_KEY
    if (!encKey) throw new Error('APP_ENCRYPTION_KEY environment variable is required')
    KEY_BUFFER = Buffer.from(encKey.slice(0, 32).padEnd(32, '\x00'), 'utf8')
  }
  return KEY_BUFFER
}

export function encrypt(plaintext: string): string {
  const key = getKeyBuffer()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  try {
    const key = getKeyBuffer()
    const data = Buffer.from(ciphertext, 'base64')
    const iv = data.subarray(0, 12)
    const tag = data.subarray(12, 28)
    const enc = data.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function hashPhone(phone: string): string {
  const salt = process.env.PHONE_HASH_SALT || 'clinicsai-phone-salt'
  return crypto.createHash('sha256').update(`${phone}:${salt}`).digest('hex')
}

export function last4(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.slice(-4)
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

// ── 2FA / TOTP (Founder Doc §33) ───────────────────────────────────────────
// Two-factor auth mandatory for Platform Admin, Clinic Admin, Finance staff.
// Uses otplib for TOTP generation/verification (RFC 6238).

const TOTP_ISSUER = process.env.TOTP_ISSUER || 'ClinicAI'

/**
 * Generate a new TOTP secret for a user (stored encrypted in DB).
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret()
}

/**
 * Generate the otpauth:// URI for QR code scanning (Google Authenticator, Authy, etc.)
 */
export function generateTOTPUri(secret: string, email: string): string {
  return authenticator.keyuri(email, TOTP_ISSUER, secret)
}

/**
 * Verify a TOTP token against the secret. Allows 1 step (30s) drift.
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    authenticator.options = { window: Number(process.env.TOTP_WINDOW) || 1 }
    return authenticator.verify({ token: token.replace(/\s/g, ''), secret })
  } catch {
    return false
  }
}

/**
 * Generate backup codes (single-use, for account recovery if phone lost).
 * Returns 8 codes — user should save these securely.
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase().replace(/(.{4})/, '$1-').slice(0, 9))
  }
  return codes
}

/**
 * Hash a backup code for storage (never store plaintext).
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.replace(/-/g, '')).digest('hex')
}

/**
 * Verify a backup code against stored hashes. Returns index if match, -1 if no match.
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const hash = hashBackupCode(code)
  return hashedCodes.indexOf(hash)
}

// ── JWT Session + Refresh Token Rotation (Founder Doc §33) ─────────────────
// Sessions are JWT access (15 min) + refresh (7 days, rotated).
// Stored in httpOnly secure cookies.

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'clinicsai-dev-secret-change-me'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'clinicsai-dev-refresh-secret-change-me'
const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL) || 900 // 15 min
const REFRESH_TTL = Number(process.env.JWT_REFRESH_TTL) || 604800 // 7 days

export interface SessionPayload {
  sub: string         // user id
  type: string        // platform_admin | platform_staff | clinic_admin | doctor | receptionist | patient
  role?: string       // sub-role (sales/onboarding/support/finance for platform_staff)
  clinicId?: string
  email: string
  name: string
  phoneHash?: string  // patient identity
  twoFactorVerified?: boolean  // true if 2FA challenge passed this session
  iat: number
  exp: number
}

export interface RefreshPayload {
  sub: string
  jti: string  // unique token ID for rotation tracking
  iat: number
  exp: number
}

/**
 * Sign an access token (short-lived, 15 min).
 */
export function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + ACCESS_TTL
  const full: SessionPayload = { ...payload, iat, exp }
  const body = Buffer.from(JSON.stringify(full)).toString('base64url')
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

/**
 * Verify an access token.
 */
export function verifySession(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url')
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Sign a refresh token (long-lived, 7 days). Each refresh token has a unique JTI
 * for rotation — when used, the old JTI is invalidated and a new one issued.
 */
export function signRefreshToken(sub: string): { token: string; jti: string } {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + REFRESH_TTL
  const jti = randomToken(16)
  const full: RefreshPayload = { sub, jti, iat, exp }
  const body = Buffer.from(JSON.stringify(full)).toString('base64url')
  const sig = crypto.createHmac('sha256', JWT_REFRESH_SECRET).update(body).digest('base64url')
  return { token: `${body}.${sig}`, jti }
}

/**
 * Verify a refresh token. Returns the payload if valid.
 */
export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = crypto.createHmac('sha256', JWT_REFRESH_SECRET).update(body).digest('base64url')
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as RefreshPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export const SESSION_COOKIE = 'clinicsai_session'
export const REFRESH_COOKIE = 'clinicsai_refresh'
