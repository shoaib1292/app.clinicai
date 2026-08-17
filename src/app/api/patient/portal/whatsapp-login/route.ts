/**
 * POST /api/patient/portal/whatsapp-login
 * Free WhatsApp magic-link login — replaces the paid SMS OTP.
 * Given a phone + clinic slug, resolves/creates the patient's portal identity,
 * generates a single-use magic link, and sends it via the clinic's WhatsApp.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { hashPhone, randomToken } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone-utils'
import { encryptPhone } from '@/lib/phone-encryption'
import { sendEvolutionMessage } from '@/lib/evolution'
import { ok, err, handle } from '@/lib/api'

const RATE_60S = 'portal:rl:60s'
const RATE_HOUR = 'portal:rl:hour'
const RATE_DAY = 'portal:rl:day'

async function whatsappLogin(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string; clinicSlug?: string }
  const rawPhone = (body.phone || '').trim()
  const clinicSlug = (body.clinicSlug || '').trim()

  if (!rawPhone) return err('Phone number is required', 400)
  if (!clinicSlug) return err('Clinic is required', 400)

  const phone = normalizePhone(rawPhone)
  const phoneHash = hashPhone(phone) // global (cross-clinic) identity hash

  // ── Rate limit (mirrors OTP limits) ──
  const now = Math.floor(Date.now() / 1000)
  const rl60s = (await store.get<number>(`${RATE_60S}:${phoneHash}`)) ?? 0
  if (rl60s > 0) {
    const wait = 60 - (now - rl60s)
    if (wait > 0) return err(`Please wait ${wait} seconds before requesting another link`, 429)
  }
  const hourCount = (await store.get<number>(`${RATE_HOUR}:${phoneHash}`)) ?? 0
  if (hourCount >= 5) return err('Too many requests. Please try again in an hour.', 429)
  const dayCount = (await store.get<number>(`${RATE_DAY}:${phoneHash}`)) ?? 0
  if (dayCount >= 10) return err('Daily limit reached. Please try again tomorrow.', 429)

  const clinic = await db.clinic.findUnique({ where: { slug: clinicSlug } })
  if (!clinic) return err('Clinic not found', 404)
  if (!clinic.patientPortalEnabled) return err('Patient portal not enabled for this clinic', 403)

  // Resolve the Evolution instance name from the clinic's WhatsApp connection
  const connection = await db.whatsAppConnection.findFirst({
    where: { clinicId: clinic.id, mode: 'evo', status: 'connected' },
    select: { evoInstanceName: true },
  })
  if (!connection?.evoInstanceName) return err('WhatsApp login is not configured for this clinic', 503)
  const instanceName = connection.evoInstanceName

  // ── Resolve/create the cross-clinic PatientAppUser ──
  let appUser = await db.patientAppUser.findUnique({ where: { phoneHash } })
  if (!appUser) appUser = await db.patientAppUser.create({ data: { phone, phoneHash } })

  // ── Ensure a clinic-scoped Patient exists + link it to the app account ──
  const patientPhoneHash = hashPhone(phone + clinic.id)
  let patient = await db.patient.findUnique({
    where: { clinicId_phoneHash: { clinicId: clinic.id, phoneHash: patientPhoneHash } },
  })
  if (!patient) {
    patient = await db.patient.create({
      data: {
        clinicId: clinic.id,
        phoneHash: patientPhoneHash,
        phoneLast4: phone.slice(-4),
        phone: encryptPhone(phone),
        gender: 'unknown',
        preferredLanguage: 'urdu',
        preferredModality: 'auto',
        appUserId: appUser.id,
      },
    })
  } else if (!patient.appUserId) {
    await db.patient.update({ where: { id: patient.id }, data: { appUserId: appUser.id } })
  }

  // ── Magic link (single-use, 15-min) ──
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await db.patientMagicLink.create({
    data: { token, appUserId: appUser.id, clinicId: clinic.id, phone, expiresAt },
  })

  const domain = process.env.DOMAIN || 'localhost:8000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const link = `${protocol}://${domain}/p/${clinic.slug}?t=${token}`

  const linkMsg = `Assalamu alaikum! Aap ka patient portal login link hai. Is par tap karein: ${link}\n(Ye link 15 minute valid hai)`
  const sendRes = await sendEvolutionMessage(instanceName, phone, linkMsg)

  if (!sendRes.ok) {
    return err('Could not send WhatsApp message. Please try again.', 502)
  }

  // persist rate limits
  await Promise.all([
    store.set(`${RATE_60S}:${phoneHash}`, now, 60),
    store.set(`${RATE_HOUR}:${phoneHash}`, hourCount + 1, 3600),
    store.set(`${RATE_DAY}:${phoneHash}`, dayCount + 1, 86400),
  ])

  return ok({ sent: true })
}

export const POST = handle(whatsappLogin)
