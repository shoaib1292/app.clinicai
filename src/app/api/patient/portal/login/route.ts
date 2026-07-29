/**
 * POST /api/patient/portal/login
 * Login ke liye OTP verify karta hai + cookie set karta hai.
 * Mobile app se alag — isme clinic association bhi create hoti hai.
 */
import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { hashPhone } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone-utils'
import { createPatientSession } from '@/lib/patient-session'
import { PATIENT_SESSION_COOKIE } from '@/lib/patient-cookie-session'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'

async function login(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    phone?: string
    otp?: string
    clinicSlug?: string
  }

  const rawPhone = (body.phone || '').trim()
  const otp = (body.otp || '').trim()
  const clinicSlug = (body.clinicSlug || '').trim()

  if (!rawPhone) return err('Phone number is required', 400)
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp))
    return err('Valid 6-digit OTP is required', 400)
  if (!clinicSlug) return err('Clinic is required', 400)

  const phone = normalizePhone(rawPhone)
  const phoneHash = hashPhone(phone)

  // Verify OTP
  const otpKey = `otp:code:${phoneHash}`
  const storedOtp = await store.get<string>(otpKey)

  if (!storedOtp || storedOtp !== otp) {
    return err('Invalid or expired OTP', 401)
  }

  // OTP valid — consume it
  await Promise.all([
    store.del(otpKey),
    store.del(`otp:fail:${phoneHash}`),
  ])

  // Find the clinic
  const clinic = await db.clinic.findUnique({
    where: { slug: clinicSlug },
    select: { id: true, patientPortalEnabled: true },
  })
  if (!clinic) return err('Clinic not found', 404)
  if (!clinic.patientPortalEnabled) return err('Patient portal not enabled for this clinic', 403)

  // Upsert PatientAppUser
  let appUser = await db.patientAppUser.findUnique({ where: { phoneHash } })
  if (!appUser) {
    appUser = await db.patientAppUser.create({ data: { phone, phoneHash } })
  }

  // Ensure Patient record exists for this clinic
  const existingPatient = await db.patient.findFirst({
    where: { appUserId: appUser.id, clinicId: clinic.id },
  })
  if (!existingPatient) {
    await db.patient.create({
      data: {
        clinicId: clinic.id,
        phone: appUser.phone,
        appUserId: appUser.id,
      },
    })
  }

  // Create JWT and set cookie
  const token = await createPatientSession(appUser.id, phoneHash)

  const res = NextResponse.json({
    ok: true,
    data: { token, appUserId: appUser.id, clinicId: clinic.id },
  })

  res.cookies.set(PATIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 3600,
  })

  return res
}

export const POST = handle(login)
