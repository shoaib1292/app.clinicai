/**
 * POST /api/patient/auth/verify-otp
 * Verify the 6-digit OTP and return a patient session JWT.
 */
import { NextRequest } from 'next/server'
import { store } from '@/lib/store'
import { db } from '@/lib/db'
import { hashPhone } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone-utils'
import { createPatientSession } from '@/lib/patient-session'
import { ok, err, handle } from '@/lib/api'

const MAX_VERIFY_ATTEMPTS = 5
const VERIFY_BLOCK_SEC = 1800 // 30 min block after 5 failures

async function verifyOTP(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string; otp?: string }
  const rawPhone = (body.phone || '').trim()
  const otp = (body.otp || '').trim()

  if (!rawPhone) return err('Phone number is required', 400)
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) return err('Valid 6-digit OTP is required', 400)

  const phone = normalizePhone(rawPhone)
  const phoneHash = hashPhone(phone)

  // ── Rate limit: max 5 verify attempts per phone ──
  const failKey = `otp:fail:${phoneHash}`
  const failCount = (await store.get<number>(failKey)) ?? 0
  if (failCount >= MAX_VERIFY_ATTEMPTS) {
    return err('Too many failed attempts. Please try again after 30 minutes.', 429)
  }

  // ── Get stored OTP ──
  const otpKey = `otp:code:${phoneHash}`
  const storedOtp = await store.get<string>(otpKey)

  if (!storedOtp || storedOtp !== otp) {
    // Increment fail counter
    const newFails = failCount + 1
    const ttl = newFails >= MAX_VERIFY_ATTEMPTS ? VERIFY_BLOCK_SEC : 300
    await store.set(failKey, newFails, ttl)
    return err('Invalid OTP', 401)
  }

  // ── OTP correct — consume (single-use) ──
  await Promise.all([
    store.del(otpKey),
    store.del(failKey), // clear fail counter on success
  ])

  // ── Upsert PatientAppUser ──
  let appUser = await db.patientAppUser.findUnique({ where: { phoneHash } })
  if (!appUser) {
    appUser = await db.patientAppUser.create({
      data: { phone, phoneHash },
    })
  }

  // ── Generate session ──
  const token = await createPatientSession(appUser.id, phoneHash)

  // ── Return attached clinics ──
  // Patient may already exist in some clinics (via WhatsApp booking).
  // These become their "attached clinics" in the app.
  const patients = await db.patient.findMany({
    where: { appUserId: appUser.id },
    select: {
      clinic: { select: { id: true, name: true, slug: true, city: true, logoUrl: true } },
    },
  })

  return ok({
    token,
    appUserId: appUser.id,
    clinics: patients.map((p) => p.clinic),
  })
}

export const POST = handle(verifyOTP)
