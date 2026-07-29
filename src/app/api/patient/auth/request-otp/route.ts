/**
 * POST /api/patient/auth/request-otp
 * Sends a 6-digit OTP via WhatsApp (Evolution) to the patient's phone.
 * Strict rate limits per phone to prevent abuse.
 */
import { NextRequest } from 'next/server'
import { store } from '@/lib/store'
import { hashPhone, randomToken } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone-utils'
import { sendEvolutionMessage } from '@/lib/evolution'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'

// Rate limit keys per normalized phone
const RATE_60S = 'otp:rl:60s'
const RATE_HOUR = 'otp:rl:hour'
const RATE_DAY = 'otp:rl:day'

async function requestOTP(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string }
  const rawPhone = (body.phone || '').trim()
  if (!rawPhone) return err('Phone number is required', 400)

  const phone = normalizePhone(rawPhone)
  const phoneHash = hashPhone(phone)

  // ── Rate limit checks ──
  const now = Math.floor(Date.now() / 1000)

  const rl60s = (await store.get<number>(`${RATE_60S}:${phoneHash}`)) ?? 0
  if (rl60s > 0) {
    const wait = 60 - (now - rl60s)
    if (wait > 0) return err(`Please wait ${wait} seconds before requesting another OTP`, 429)
  }

  const hourKey = `${RATE_HOUR}:${phoneHash}`
  const hourCount = (await store.get<number>(hourKey)) ?? 0
  if (hourCount >= 5) return err('Too many OTP requests. Please try again in an hour.', 429)

  const dayKey = `${RATE_DAY}:${phoneHash}`
  const dayCount = (await store.get<number>(dayKey)) ?? 0
  if (dayCount >= 10) return err('Daily OTP limit reached. Please try again tomorrow.', 429)

  // ── Generate OTP ──
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const otpKey = `otp:code:${phoneHash}`

  // ── Persist rate limits + OTP ──
  await Promise.all([
    store.set(`${RATE_60S}:${phoneHash}`, now, 60),
    store.set(hourKey, hourCount + 1, 3600),
    store.set(dayKey, dayCount + 1, 86400),
    store.set(otpKey, otp, 300), // 5 min expiry
  ])

  // ── Send OTP via WhatsApp Evolution ──
  // Use ANY connected Evolution instance (platform-level sending)
  const anyClinic = await db.clinic.findFirst({
    where: { evolutionConnected: true, evolutionInstance: { not: null } },
    select: { evolutionInstance: true },
    orderBy: { createdAt: 'asc' },
  })

  if (anyClinic?.evolutionInstance) {
    await sendEvolutionMessage(anyClinic.evolutionInstance, phone, `Your ClinicAI verification code is: ${otp}`)
    return ok({ sent: true, expiresIn: 300 })
  }

  // Fallback: if no Evolution instance is connected, still return OK
  // (the OTP is stored; in dev/sandbox the code is shown in logs)
  console.log(`[patient:otp] OTP for ${phoneHash.slice(0, 8)}: ${otp}`)
  return ok({ sent: true, expiresIn: 300, note: 'WhatsApp delivery unavailable; OTP logged for dev' })
}

export const POST = handle(requestOTP)
