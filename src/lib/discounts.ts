import { db } from '@/lib/db'
import { hashPhone } from '@/lib/auth'
import crypto from 'crypto'

// ── Referral Program ──

export async function getReferralProgram(clinicId: string) {
  let program = await db.referralProgram.findUnique({ where: { clinicId } })
  if (!program) {
    program = await db.referralProgram.create({
      data: { clinicId, enabled: true, refereeDiscount: 100, referrerReward: 100 },
    })
  }
  return program
}

export async function upsertReferralProgram(
  clinicId: string,
  data: { enabled?: boolean; refereeDiscount?: number; referrerReward?: number },
) {
  const existing = await db.referralProgram.findUnique({ where: { clinicId } })
  if (existing) {
    return db.referralProgram.update({ where: { clinicId }, data })
  }
  return db.referralProgram.create({ data: { clinicId, ...data } })
}

// ── Referral Code ──

function generateCode(length = 6): string {
  return crypto.randomBytes(length).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '0').slice(0, length)
}

export async function getOrCreateReferralCode(clinicId: string, patientId: string) {
  let refCode = await db.referralCode.findFirst({ where: { clinicId, patientId } })
  if (!refCode) {
    for (let i = 0; i < 5; i++) {
      const code = generateCode()
      const existing = await db.referralCode.findUnique({ where: { code } })
      if (!existing) {
        refCode = await db.referralCode.create({ data: { clinicId, patientId, code } })
        break
      }
    }
    if (!refCode) throw new Error('Failed to generate unique referral code')
  }
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { slug: true } })
  return { code: refCode.code, link: `https://app.clinicai.pk/r/${clinic?.slug ?? clinicId}/${refCode.code}` }
}

// ── Promo Code Validation ──

interface ValidatePromoCodeParams {
  clinicId: string
  code: string
  serviceId?: string
  doctorId?: string
  patientId?: string
}

export async function validatePromoCode(params: ValidatePromoCodeParams): Promise<{
  offer?: { id: string; title: string; type: string; value: number; maxDiscount?: number | null }
  discountAmount?: number
  error?: string
}> {
  const { clinicId, code, serviceId, doctorId, patientId } = params
  const offer = await db.offer.findUnique({ where: { promoCode: code.toUpperCase() } })
  if (!offer) return { error: 'Invalid promo code' }
  if (offer.clinicId !== clinicId) return { error: 'This code is not valid for this clinic' }
  if (!offer.active) return { error: 'This offer is no longer active' }

  const now = new Date()
  if (offer.startsAt && now < offer.startsAt) return { error: 'This offer has not started yet' }
  if (offer.endsAt && now > offer.endsAt) return { error: 'This offer has expired' }

  if (offer.limit && offer.usedCount >= offer.limit) return { error: 'This offer has reached its redemption limit' }

  if (offer.serviceId && offer.serviceId !== serviceId) return { error: 'This code is not valid for the selected service' }
  if (offer.doctorId && offer.doctorId !== doctorId) return { error: 'This code is not valid for the selected doctor' }

  if (offer.appliesTo === 'new_patients') {
    if (!patientId) return { error: 'Please provide patient details' }
    const patient = await db.patient.findUnique({ where: { id: patientId }, select: { totalVisits: true } })
    if (patient && patient.totalVisits > 0) return { error: 'This offer is for new patients only' }
  }

  const discountAmount = offer.type === 'percent'
    ? Math.min(Math.floor(offer.value / 100 * 999999), offer.maxDiscount ?? 999999)
    : offer.value

  return {
    offer: { id: offer.id, title: offer.title, type: offer.type, value: offer.value, maxDiscount: offer.maxDiscount },
    discountAmount,
  }
}

// ── Booking Discount Resolution ──

interface ResolveBookingDiscountParams {
  clinicId: string
  promoCode?: string
  refCode?: string
  patientId?: string
  refereePhone?: string
  serviceId?: string
  doctorId?: string
}

interface DiscountResult {
  offerId?: string
  discountAmount: number
  appliedBy: 'promo' | 'referral' | null
  referralCodeId?: string
  referrerPatientId?: string
  refereeRewardAmount?: number
  error?: string
}

export async function resolveBookingDiscount(params: ResolveBookingDiscountParams): Promise<DiscountResult> {
  const { clinicId, promoCode, refCode, patientId, refereePhone, serviceId, doctorId } = params
  let totalDiscount = 0
  let appliedBy: DiscountResult['appliedBy'] = null
  let offerId: string | undefined
  let referralCodeId: string | undefined
  let referrerPatientId: string | undefined
  let refereeRewardAmount: number | undefined

  // 1. Promo code
  if (promoCode) {
    const result = await validatePromoCode({ clinicId, code: promoCode, serviceId, doctorId, patientId })
    if (result.error) return { discountAmount: 0, appliedBy: null, error: result.error }
    totalDiscount += result.discountAmount ?? 0
    offerId = result.offer?.id
    appliedBy = 'promo'
  }

  // 2. Referral code
  if (refCode) {
    const ref = await db.referralCode.findUnique({
      where: { code: refCode.toUpperCase() },
      include: { patient: { select: { phoneHash: true, phone: true, id: true } } },
    })
    if (!ref || ref.clinicId !== clinicId) return { discountAmount: 0, appliedBy: null, error: 'Invalid referral code' }

    // Self-referral guard
    if (refereePhone) {
      const clinicIdForHash = clinicId
      const refPhoneHash = hashPhone(refereePhone + clinicIdForHash)
      if (refPhoneHash === ref.patient.phoneHash) {
        return { discountAmount: 0, appliedBy: null, error: 'You cannot use your own referral code' }
      }
    }

    const program = await getReferralProgram(clinicId)
    if (!program.enabled) return { discountAmount: 0, appliedBy: null, error: 'Referral program is not active' }

    totalDiscount += program.refereeDiscount
    referralCodeId = ref.id
    referrerPatientId = ref.patientId
    refereeRewardAmount = program.referrerReward
    if (!appliedBy) appliedBy = 'referral'

    // If referral, also create the offer redemption record type
    let refOffer = await db.offer.findFirst({ where: { clinicId, isReferral: true, active: true } })
    if (!refOffer) {
      refOffer = await db.offer.create({
        data: { clinicId, title: 'Referral Discount', type: 'flat', value: program.refereeDiscount, isReferral: true, appliesTo: 'all' },
      })
    }
    if (!offerId) offerId = refOffer.id
  }

  return { offerId, discountAmount: totalDiscount, appliedBy, referralCodeId, referrerPatientId, refereeRewardAmount }
}

// ── Apply discount to fees ──

export function applyDiscountToFees(
  fees: { doctorFee: number; clinicMarkup: number; platformFee: number; total: number },
  discountAmount: number,
) {
  const discount = Math.min(discountAmount, fees.total)
  return { ...fees, discount, total: Math.max(0, fees.total - discount) }
}

// ── Record Redemption ──

export async function recordRedemption(params: {
  clinicId: string
  offerId: string
  appointmentId: string
  patientId: string
  discountAmount: number
  appliedBy: 'promo' | 'referral' | 'auto'
}) {
  // Atomic increment with limit recheck
  const offer = await db.offer.findUnique({ where: { id: params.offerId }, select: { limit: true, usedCount: true } })
  if (offer?.limit && offer.usedCount >= offer.limit) {
    throw new Error('Offer redemption limit reached')
  }

  await db.offer.update({ where: { id: params.offerId }, data: { usedCount: { increment: 1 } } })

  return db.offerRedemption.create({
    data: {
      clinicId: params.clinicId,
      offerId: params.offerId,
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      discountAmount: params.discountAmount,
      appliedBy: params.appliedBy,
    },
  })
}
