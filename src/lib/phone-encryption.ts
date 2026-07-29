/**
 * ClinicAI — Patient phone encryption.
 *
 * Encrypts patient phone numbers at rest using AES-256-GCM (via auth.ts).
 * Only authorized roles can decrypt — others see only the last 4 digits.
 *
 * PhoneHash (SHA-256) is stored separately for duplicate detection
 * and remains queryable regardless of encryption.
 */

import { encrypt, decrypt } from './auth'
import { normalizePhone } from './phone-utils'

const PHONE_PREFIX = 'phone_enc:v1:'

/**
 * Encrypt a patient phone number for storage.
 * Normalizes to canonical format (+92300...) before encrypting.
 * Returns ciphertext with a version prefix for future key rotation.
 */
export function encryptPhone(plaintext: string): string {
  const normalized = normalizePhone(plaintext)
  const ciphertext = encrypt(normalized)
  return `${PHONE_PREFIX}${ciphertext}`
}

/**
 * Decrypt a patient phone number for display.
 * Detects plaintext (legacy data) and returns it as-is.
 * Returns empty string on decryption failure.
 */
export function decryptPhone(ciphertext: string): string {
  // Legacy plaintext phone numbers (pre-encryption)
  if (!ciphertext.startsWith(PHONE_PREFIX)) {
    return ciphertext
  }
  const payload = ciphertext.slice(PHONE_PREFIX.length)
  return decrypt(payload) || ''
}

/**
 * Decrypt and mask a phone number for display.
 * Shows only the last 4 digits with asterisks: ******1234
 * Falls back to last-4 masking for legacy plaintext numbers.
 */
export function maskPhone(ciphertext: string): string {
  const plain = decryptPhone(ciphertext)
  if (!plain) return 'Unknown'
  const digits = plain.replace(/\D/g, '')
  if (digits.length <= 4) return `****${digits}`
  const last4 = digits.slice(-4)
  const masked = '*'.repeat(Math.max(digits.length - 4, 4))
  return `${masked}${last4}`
}

/**
 * Check if a phone value is encrypted (starts with the encryption prefix).
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PHONE_PREFIX)
}
