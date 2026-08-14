/**
 * Auth module unit tests.
 * Tests JWT signing/verification, 2FA TOTP, password hashing, encryption.
 */
import { describe, it, expect, beforeAll } from 'vitest'

// auth.ts reads these secrets at module-eval time and throws if unset.
// Set them before any import so the module loads in the test environment.
beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY || 'test-encryption-key-32-bytes-long!'
  process.env.PHONE_HASH_SALT = process.env.PHONE_HASH_SALT || 'test-phone-hash-salt'
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret'
})

describe('Auth Module', () => {
  describe('hashPhone()', () => {
    it('should consistently hash the same phone number', async () => {
      const { hashPhone } = await import('@/lib/auth')
      const hash1 = hashPhone('03001234567')
      const hash2 = hashPhone('03001234567')
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different numbers', async () => {
      const { hashPhone } = await import('@/lib/auth')
      const hash1 = hashPhone('03001234567')
      const hash2 = hashPhone('03007654321')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Encryption (AES-256-GCM)', () => {
    it('should encrypt and decrypt successfully', async () => {
      const { encrypt, decrypt } = await import('@/lib/auth')
      const plaintext = 'my-secret-api-key-12345'
      const encrypted = encrypt(plaintext)
      expect(encrypted).toBeTruthy()
      expect(encrypted).not.toBe(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertexts for the same plaintext', async () => {
      const { encrypt } = await import('@/lib/auth')
      const plaintext = 'test-value'
      const enc1 = encrypt(plaintext)
      const enc2 = encrypt(plaintext)
      expect(enc1).not.toBe(enc2)
    })
  })

  describe('JWT Session', () => {
    it('should sign and verify a session token', async () => {
      const { signSession, verifySession } = await import('@/lib/auth')
      const payload = { sub: 'user123', type: 'platform_admin', email: 'admin@test.com', name: 'Test Admin' }
      const token = signSession(payload)
      expect(token).toBeTruthy()
      expect(token).toContain('.')

      const decoded = verifySession(token)
      expect(decoded).not.toBeNull()
      expect(decoded!.sub).toBe('user123')
      expect(decoded!.type).toBe('platform_admin')
      expect(decoded!.email).toBe('admin@test.com')
    })

    it('should reject tampered tokens', async () => {
      const { signSession, verifySession } = await import('@/lib/auth')
      const token = signSession({ sub: 'user1', type: 'clinic_admin', email: 'a@b.com', name: 'Test' })
      const [body, _] = token.split('.')
      const tampered = `${body}.tampered_signature`
      const decoded = verifySession(tampered)
      expect(decoded).toBeNull()
    })

    it('should reject expired tokens', async () => {
      const { verifySession } = await import('@/lib/auth')
      const expiredPayload = { sub: 'u1', type: 'doctor', email: 'd@c.com', name: 'Dr. X', iat: 0, exp: 0 }
      const body = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url')
      const sig = 'fake'
      const decoded = verifySession(`${body}.${sig}`)
      expect(decoded).toBeNull()
    })
  })

  describe('TOTP 2FA', () => {
    it('should generate a valid TOTP secret', async () => {
      const { generateTOTPSecret } = await import('@/lib/auth')
      const secret = generateTOTPSecret()
      expect(secret).toBeTruthy()
      expect(secret.length).toBeGreaterThan(10)
    })

    it('should generate a valid otpauth URI', async () => {
      const { generateTOTPSecret, generateTOTPUri } = await import('@/lib/auth')
      const secret = generateTOTPSecret()
      const uri = generateTOTPUri(secret, 'test@clinicsai.com')
      expect(uri).toContain('otpauth://totp/')
      expect(uri).toContain('ClinicAI')
      expect(uri).toContain('test%40clinicsai.com')
    })
  })

  describe('Backup Codes', () => {
    it('should generate 8 backup codes', async () => {
      const { generateBackupCodes } = await import('@/lib/auth')
      const codes = generateBackupCodes()
      expect(codes).toHaveLength(8)
      codes.forEach((code) => {
        expect(code.length).toBeGreaterThan(5)
      })
    })

    it('should hash and verify backup codes', async () => {
      const { hashBackupCode, verifyBackupCode } = await import('@/lib/auth')
      const code = 'ABCD-1234'
      const hash = hashBackupCode(code)
      expect(hash).toBeTruthy()
      expect(hash).not.toBe(code)

      const idx = verifyBackupCode(code, [hash, 'other_hash'])
      expect(idx).toBe(0)
    })
  })
})
