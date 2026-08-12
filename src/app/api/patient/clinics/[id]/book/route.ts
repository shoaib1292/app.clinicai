/**
 * POST /api/patient/clinics/[id]/book
 * Patient books an appointment via the app.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { requirePatientAuth } from '@/lib/patient-session'
import { computeFees } from '@/lib/schedule'
import { encryptPhone } from '@/lib/phone-encryption'
import { hashPhone, last4 } from '@/lib/auth'
import { publishAppointmentBooked } from '@/lib/automation-publisher'
import { ok, err, handle } from '@/lib/api'
import { resolveBookingDiscount, applyDiscountToFees, recordRedemption } from '@/lib/discounts'

async function book(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clinicId } = await params
  const { appUserId } = await requirePatientAuth(req)

  const body = (await req.json().catch(() => ({}))) as {
    doctorId?: string
    slotId?: string
    serviceId?: string
    paymentMode?: string
    paymentProof?: string
    modality?: string
    promoCode?: string
    refCode?: string
  }

  const { doctorId, slotId, serviceId, promoCode, refCode } = body
  if (!doctorId || !slotId) return err('doctorId and slotId are required', 400)

  const doctor = await db.doctor.findUnique({ where: { id: doctorId } })
  if (!doctor || doctor.clinicId !== clinicId) return err('Doctor not found', 404)

  const slot = await db.slot.findFirst({
    where: { id: slotId, doctorId, clinicId },
  })
  if (!slot) return err('Slot not found', 404)
  if (slot.status !== 'open') return err('Slot not available', 409)

  // ── Acquire slot lock ──
  const lockToken = await store.acquireLock(`slot:${slotId}`, 300)
  if (!lockToken) return err('Slot is being booked by someone else', 409)

  try {
    // ── Resolve patient (auto-attach to appUser) ──
    const appUser = await db.patientAppUser.findUnique({ where: { id: appUserId } })
    if (!appUser) return err('Patient not found', 404)

    const phoneHash = hashPhone(appUser.phone)
    let patient = await db.patient.findFirst({
      where: { appUserId, clinicId },
    })

    if (!patient) {
      patient = await db.patient.findUnique({
        where: { clinicId_phoneHash: { clinicId, phoneHash } },
      })
      if (patient && !patient.appUserId) {
        patient = await db.patient.update({ where: { id: patient.id }, data: { appUserId } })
      }
      if (!patient) {
        patient = await db.patient.create({
          data: {
            clinicId,
            phoneHash,
            phoneLast4: last4(appUser.phone),
            phone: encryptPhone(appUser.phone),
            name: null,
            gender: 'unknown',
            preferredLanguage: 'urdu',
            preferredModality: 'auto',
            appUserId,
          },
        })
      }
    }

    // ── Construct proper Date from slot.date + slot.startTime ──
    const [h, m] = slot.startTime.split(':').map(Number)
    const start = new Date(slot.date)
    start.setHours(h || 0, m || 0, 0, 0)

    const durationMin = doctor.slotDurationMin || 15
    const end = new Date(start.getTime() + durationMin * 60 * 1000)

    // ── Resolve service + compute real fees ──
    let service = serviceId ? await db.service.findFirst({ where: { id: serviceId, clinicId } }) : null
    if (!service) {
      service = await db.service.findFirst({ where: { doctorId, clinicId } })
    }
    if (!service) return err('No service configured for this doctor', 400)

    const clinicRule = await db.pricingRule.findFirst({ where: { clinicId } })
    const globalRule = await db.pricingRule.findFirst({ where: { scope: 'global' } })
    const platformFeeDefault = clinicRule?.platformFeeDefault ?? globalRule?.platformFeeDefault ?? 50
    const platformFeeOverride = clinicRule?.platformFeeOverride ?? null
    const clinicMarkup = clinicRule?.markupDefault ?? globalRule?.markupDefault ?? 0

    const fees = computeFees({ doctorFee: service.baseFee, clinicMarkup, platformFeeDefault, platformFeeOverride })

    // ── Resolve discount ──
    const discount = await resolveBookingDiscount({
      clinicId, promoCode, refCode,
      patientId: patient.id, refereePhone: appUser.phone,
      serviceId: service.id, doctorId,
    })
    if (discount.error) return err(discount.error, 400)

    // ── Auto-apply patient reward balance ──
    let rewardUsed = 0
    if (patient.rewardBalance > 0) {
      rewardUsed = Math.min(patient.rewardBalance, fees.total - discount.discountAmount)
    }

    const totalDiscount = discount.discountAmount + rewardUsed
    const discountedFees = applyDiscountToFees(fees, totalDiscount)

    // ── Create appointment ──
    const appt = await db.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        doctorId,
        slotId,
        start,
        end,
        status: 'booked',
        serviceId: service.id,
        paymentMode: body.paymentMode || 'screenshot',
        totalFee: discountedFees.total,
        doctorFee: discountedFees.doctorFee,
        clinicMarkup: discountedFees.clinicMarkup,
        platformFee: discountedFees.platformFee,
        isTelemedicine: body.modality === 'video',
        modality: body.modality || 'in_clinic',
      },
    })

    // ── Fee breakdown ──
    await db.appointmentFees.create({
      data: {
        appointmentId: appt.id,
        baseDoctorFee: fees.doctorFee,
        clinicMarkup: fees.clinicMarkup,
        platformFee: fees.platformFee,
        platformFeeOverride,
        total: discountedFees.total,
        discount: totalDiscount,
        currency: 'PKR',
      },
    })

    // ── Deduct reward balance ──
    if (rewardUsed > 0) {
      await db.patient.update({
        where: { id: patient.id },
        data: { rewardBalance: { decrement: rewardUsed } },
      })
    }

    // ── Record redemption ──
    if (discount.offerId && discount.discountAmount > 0) {
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

    // ── Mark slot as booked ──
    await db.slot.update({
      where: { id: slotId },
      data: { status: 'booked' },
    })

    // ── Create single 30-min reminder ──
    await db.reminder.create({
      data: {
        appointmentId: appt.id,
        type: 'reminder_30min',
        sendAt: new Date(start.getTime() - 30 * 60 * 1000),
        status: 'pending',
        channel: 'whatsapp',
      },
    })

    // ── Credit debit ──
    const clinicRecord = await db.clinic.findUnique({ where: { id: clinicId }, select: { creditBalance: true } })
    const newBalance = (clinicRecord?.creditBalance ?? 0) - fees.platformFee
    await db.clinic.update({ where: { id: clinicId }, data: { creditBalance: Math.max(0, newBalance) } })

    // ── Publish event ──
    publishAppointmentBooked(
      clinicId,
      { id: appt.id, status: 'booked' },
      { id: patient.id, name: patient.name || 'Patient', phone: patient.phone },
      { id: doctorId, name: doctor.name },
      clinicRecord?.creditBalance ? `${clinicRecord.creditBalance}` : 'Clinic',
    )

    await store.publish(`clinic:${clinicId}:queue`, {
      type: 'slot_booked',
      appointmentId: appt.id,
      slotId,
      patientId: patient.id,
      doctorId,
    })

    return ok({
      appointmentId: appt.id,
      start,
      doctor: doctor.name,
      tokenNo: slot.tokenNo,
    })
  } finally {
    await store.releaseLock(`slot:${slotId}`, lockToken)
  }
}

export const POST = handle(book)
