import crypto from 'crypto'
import { store } from './store'
import { db } from './db'
import { decrypt } from './auth'

const OTP_TTL_SEC = 300
const OTP_MAX_REQUESTS = 3
const OTP_RATE_WINDOW_SEC = 300

export function generateOTP(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0')
}

export async function storeOTP(userId: string, phone: string, code: string): Promise<void> {
  await store.set(`otp:code:${userId}`, JSON.stringify({ code, phone }), OTP_TTL_SEC)
}

export async function verifyOTP(userId: string, code: string): Promise<boolean> {
  const raw = await store.get<string>(`otp:code:${userId}`)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as { code: string; phone: string }
    return parsed.code === code.replace(/\s/g, '')
  } catch {
    return false
  }
}

export async function consumeOTP(userId: string): Promise<void> {
  await store.del(`otp:code:${userId}`)
}

export async function checkOTPRateLimit(userId: string): Promise<boolean> {
  const key = `otp:rate:${userId}`
  const count = (await store.get<number>(key)) ?? 0
  if (count >= OTP_MAX_REQUESTS) return false
  await store.set(key, count + 1, OTP_RATE_WINDOW_SEC)
  return true
}

export async function sendWhatsAppOTP(phone: string, clinicId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const message = `Your ClinicAI verification code is: ${code}. It expires in 5 minutes.`

  const conn = await db.whatsAppConnection.findFirst({
    where: { clinicId, status: 'connected' },
    orderBy: { createdAt: 'desc' },
  })

  if (!conn) {
    return { ok: false, error: 'No active WhatsApp connection for this clinic' }
  }

  if (conn.mode === 'evo' && conn.evoInstanceName) {
    const { sendEvolutionMessage } = await import('./evolution')
    return sendEvolutionMessage(conn.evoInstanceName, phone, message)
  }

  if (conn.mode === 'meta' && conn.metaPhoneId && conn.metaTokenEnc) {
    const { sendMetaMessage } = await import('./meta')
    return sendMetaMessage(conn.metaPhoneId, decrypt(conn.metaTokenEnc), phone, message)
  }

  return { ok: false, error: 'WhatsApp connection not fully configured' }
}

export function getMaskedPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length < 4) return '••••'
  return `•••${clean.slice(-4)}`
}
