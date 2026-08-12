import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPhone, last4 } from '@/lib/auth'
import { computeFees } from '@/lib/schedule'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'
import { resolveBookingDiscount, applyDiscountToFees, recordRedemption } from '@/lib/discounts'

// Public endpoint: POST /api/public/book
// No auth — for shareable booking links. Creates appointment + patient.
interface BookBody {
  doctorId: string
  slotId: string
  patientPhone: string
  patientName?: string
  patientGender?: string
  serviceId?: string
  paymentMode?: string
  promoCode?: string
  refCode?: string
}

async function book(req: NextRequest) {
  const body = (await req.json()) as BookBody
  const { doctorId, slotId, patientPhone, patientName, patientGender, serviceId, paymentMode, promoCode, refCode } = body

  if (!doctorId || !slotId || !patientPhone) return err('doctorId, slotId, patientPhone required', 400)

  const doctor = await db.doctor.findUnique({ where: { id: doctorId } })
  if (!doctor) return err('Doctor not found', 404)

  const slot = await db.slot.findFirst({ where: { id: slotId, doctorId, clinicId: doctor.clinicId } })
  if (!slot) return err('Slot not found', 404)
  if (slot.status !== 'open') return err('Slot not available', 409)

  const clinicId = doctor.clinicId

  // Rate limit per IP (basic abuse protection — founder doc §42: 50 bookings/hour)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
  const rateKey = `public_book:${ip}`
  const count = store.get<number>(rateKey) || 0
  if (count >= 50) return err('Rate limit exceeded. Please try again later.', 429)
  store.set(rateKey, count + 1, 3600)

  const lockToken = await store.acquireLock(`slot:${slotId}`, 300)
  if (!lockToken) return err('Slot is being booked by someone else', 409)

  try {
    const phoneHash = hashPhone(patientPhone + clinicId)
    let patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId, phoneHash } } })
    if (!patient) {
      patient = await db.patient.create({
        data: {
          clinicId, phoneHash, phoneLast4: last4(patientPhone), phone: patientPhone,
          name: patientName || null, gender: (patientGender as 'male' | 'female' | 'unknown') || 'unknown',
          preferredLanguage: 'urdu', preferredModality: 'auto',
        },
      })
    } else if (patientName && !patient.name) {
      patient = await db.patient.update({ where: { id: patient.id }, data: { name: patientName } })
    }

    let service = serviceId ? await db.service.findFirst({ where: { id: serviceId, clinicId } }) : null
    if (!service) service = await db.service.findFirst({ where: { doctorId, clinicId } })
    if (!service) return err('No service configured for this doctor', 400)

    // ── Resolve discount ──
    const discount = await resolveBookingDiscount({
      clinicId, promoCode, refCode,
      patientId: patient.id, refereePhone: patientPhone,
      serviceId: service.id, doctorId,
    })
    if (discount.error) return err(discount.error, 400)

    const clinicRule = await db.pricingRule.findFirst({ where: { clinicId } })
    const globalRule = await db.pricingRule.findFirst({ where: { scope: 'global' } })
    const platformFeeDefault = clinicRule?.platformFeeDefault ?? globalRule?.platformFeeDefault ?? 50
    const platformFeeOverride = clinicRule?.platformFeeOverride ?? null
    const clinicMarkup = clinicRule?.markupDefault ?? globalRule?.markupDefault ?? 0
    const fees = computeFees({ doctorFee: service.baseFee, clinicMarkup, platformFeeDefault, platformFeeOverride })
    const discountedFees = applyDiscountToFees(fees, discount.discountAmount)

    await db.slot.update({ where: { id: slotId }, data: { status: 'booked', holdExpiresAt: null } })

    const start = new Date(slot.date)
    const [sh, sm] = slot.startTime.split(':').map(Number)
    start.setUTCHours(sh, sm, 0, 0)
    const end = new Date(start.getTime() + doctor.slotDurationMin * 60 * 1000)

    const appt = await db.appointment.create({
      data: {
        clinicId, patientId: patient.id, doctorId, slotId, serviceId: service.id,
        start, end, status: 'booked', channel: 'link',
        doctorFee: discountedFees.doctorFee, clinicMarkup: discountedFees.clinicMarkup,
        platformFee: discountedFees.platformFee, totalFee: discountedFees.total,
        paymentStatus: 'pending', paymentMode: paymentMode || 'cash', createdVia: 'link',
      },
    })

    await db.appointmentFees.create({
      data: {
        appointmentId: appt.id, baseDoctorFee: fees.doctorFee, clinicMarkup: fees.clinicMarkup,
        platformFee: fees.platformFee, platformFeeOverride,
        total: discountedFees.total, discount: discount.discountAmount, currency: 'PKR',
      },
    })

    // ── Record redemption ──
    if (discount.offerId) {
      await recordRedemption({
        clinicId, offerId: discount.offerId, appointmentId: appt.id,
        patientId: patient.id, discountAmount: discount.discountAmount,
        appliedBy: discount.appliedBy ?? 'promo',
      })
    }

    // ── Record referral event ──
    if (discount.referralCodeId && discount.referrerPatientId) {
      await db.referralEvent.create({
        data: {
          clinicId, referralCodeId: discount.referralCodeId,
          referrerPatientId: discount.referrerPatientId,
          refereePhoneHash: phoneHash, refereePatientId: patient.id,
          appointmentId: appt.id, status: 'booked',
          discountApplied: discount.discountAmount,
          rewardAmount: discount.refereeRewardAmount ?? 0,
        },
      })
    }

    // Debit platform fee
    const platformCharge = Math.max(0, discountedFees.platformFee - discount.discountAmount)
    const lastEntry = await db.creditLedger.findFirst({ where: { clinicId }, orderBy: { createdAt: 'desc' } })
    const balanceAfter = (lastEntry?.balanceAfter ?? 0) - platformCharge
    await db.creditLedger.create({
      data: { clinicId, type: 'debit', amount: platformCharge, reason: 'appointment_fee', appointmentId: appt.id, balanceAfter },
    })
    await db.clinic.update({ where: { id: clinicId }, data: { creditBalance: balanceAfter } })

    // Schedule reminders
    const offsets = [
      { type: 'reminder_24h', ms: 24 * 60 * 60 * 1000 },
      { type: 'reminder_2h', ms: 2 * 60 * 60 * 1000 },
      { type: 'reminder_30min', ms: 30 * 60 * 1000 },
    ]
    for (const o of offsets) {
      const sendAt = new Date(start.getTime() - o.ms)
      if (sendAt.getTime() > Date.now()) {
        await db.reminder.create({ data: { appointmentId: appt.id, type: o.type, sendAt, status: 'pending', channel: 'whatsapp' } })
      }
    }

    store.publish(`clinic:${clinicId}:queue`, { type: 'slot_booked', appointmentId: appt.id, slotId, patientName, doctorId })

    return ok({
      appointmentId: appt.id,
      patient: { id: patient.id, name: patient.name, phone: patient.phone },
      slot: { id: slot.id, startTime: slot.startTime, endTime: slot.endTime, tokenNo: slot.tokenNo },
      fees: { ...discountedFees, discount: discount.discountAmount },
      discount: { amount: discount.discountAmount, appliedBy: discount.appliedBy },
    })
  } finally {
    store.releaseLock(`slot:${slotId}`, lockToken)
  }
}

export const POST = handle(book)
