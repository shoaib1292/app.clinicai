import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import type { AppointmentStatus, Gender } from '@prisma/client'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { hashPhone, last4 } from '@/lib/auth'
import { encryptPhone, decryptPhone } from '@/lib/phone-encryption'
import { computeFees, computeRefund } from '@/lib/schedule'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'
import { resolveCalendarProvider, resolveMeetingProvider } from '@/lib/providers/registry'
import { resolveBookingDiscount, applyDiscountToFees, recordRedemption } from '@/lib/discounts'

interface BookBody {
  doctorId: string
  slotId: string
  patientPhone: string
  patientName?: string
  patientGender?: string
  familyMemberId?: string
  serviceId?: string
  channel?: string
  paymentMode?: string
  createdVia?: string
  modality?: string
  promoCode?: string
  refCode?: string
}

async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const doctorId = url.searchParams.get('doctorId')
  const limit = Number(url.searchParams.get('limit') || '50')

  const appts = await db.appointment.findMany({
    where: {
      clinicId,
      AND: [
        status ? { status: status as AppointmentStatus } : {},
        from ? { start: { gte: new Date(from) } } : {},
        to ? { end: { lte: new Date(to) } } : {},
        doctorId ? { doctorId } : {},
      ],
    },
    orderBy: { start: 'desc' },
    take: limit,
    include: {
      patient: true,
      doctor: true,
      service: true,
      fees: true,
    },
  })
  return ok(appts.map((a) => ({ ...a, patient: { ...a.patient, phone: decryptPhone(a.patient.phone) } })))
}

async function book(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = (await req.json()) as BookBody
  const { doctorId, slotId, patientPhone, patientName, patientGender, familyMemberId, serviceId, channel, paymentMode, createdVia, promoCode, refCode } = body

  if (!doctorId || !slotId || !patientPhone) return err('doctorId, slotId, patientPhone required', 400)

  // Validate doctor + slot belong to this clinic
  const doctor = await db.doctor.findFirst({ where: { id: doctorId, clinicId } })
  if (!doctor) return err('Doctor not found', 404)

  // Telemedicine validation
  if (body.modality === 'video' && !doctor.canTelemedicine) {
    return err('This doctor does not offer video consultations', 400)
  }

  const slot = await db.slot.findFirst({ where: { id: slotId, doctorId, clinicId } })
  if (!slot) return err('Slot not found', 404)
  if (slot.status !== 'open') return err('Slot not available', 409)

  // Acquire Redis-style lock (in-memory store)
  const lockToken = await store.acquireLock(`slot:${slotId}`, 300)
  if (!lockToken) return err('Slot is being booked by someone else — please pick another', 409)

  try {
    // Re-check status after acquiring lock
    const fresh = await db.slot.findUnique({ where: { id: slotId } })
    if (!fresh || fresh.status !== 'open') return err('Slot taken', 409)

    // Resolve or create patient
    const phoneHash = hashPhone(patientPhone + clinicId)
    let patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId, phoneHash } } })
    if (!patient) {
      patient = await db.patient.create({
        data: {
          clinicId,
          phoneHash,
          phoneLast4: last4(patientPhone),
          phone: encryptPhone(patientPhone),
          name: patientName || null,
          gender: (patientGender || 'unknown') as Gender,
          preferredLanguage: 'urdu',
          preferredModality: 'auto',
        },
      })
    } else if (patientName && !patient.name) {
      patient = await db.patient.update({ where: { id: patient.id }, data: { name: patientName, gender: (patientGender || patient.gender) as Gender } })
    }

    // Resolve service
    let service = serviceId ? await db.service.findFirst({ where: { id: serviceId, clinicId } }) : null
    if (!service) {
      service = await db.service.findFirst({ where: { doctorId, clinicId } })
    }
    if (!service) return err('No service configured for this doctor', 400)

    // ── Resolve discount ──
    const discount = await resolveBookingDiscount({
      clinicId, promoCode, refCode,
      patientId: patient.id, serviceId: service.id, doctorId,
    })
    if (discount.error) return err(discount.error, 400)

    // Get pricing rule
    const clinicRule = await db.pricingRule.findFirst({ where: { clinicId } })
    const globalRule = await db.pricingRule.findFirst({ where: { scope: 'global' } })
    const platformFeeDefault = clinicRule?.platformFeeDefault ?? globalRule?.platformFeeDefault ?? 50
    const platformFeeOverride = clinicRule?.platformFeeOverride ?? null

    const clinicMarkup = clinicRule?.markupDefault ?? globalRule?.markupDefault ?? 0

    const fees = computeFees({
      doctorFee: service.baseFee,
      clinicMarkup,
      platformFeeDefault,
      platformFeeOverride,
    })
    const discountedFees = applyDiscountToFees(fees, discount.discountAmount)

    // Mark slot as booked
    await db.slot.update({ where: { id: slotId }, data: { status: 'booked', holdExpiresAt: null } })

    // Create appointment
    const start = new Date(slot.date)
    const [sh, sm] = slot.startTime.split(':').map(Number)
    start.setUTCHours(sh, sm, 0, 0)
    const end = new Date(start.getTime() + doctor.slotDurationMin * 60 * 1000)

    const appt = await db.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        familyMemberId: familyMemberId || null,
        doctorId,
        slotId,
        serviceId: service.id,
        start,
        end,
        status: 'booked',
        channel: channel || 'manual',
        doctorFee: discountedFees.doctorFee,
        clinicMarkup: discountedFees.clinicMarkup,
        platformFee: discountedFees.platformFee,
        totalFee: discountedFees.total,
        paymentStatus: 'pending',
        paymentMode: paymentMode || 'cash',
        createdByStaffId: session.sub,
        createdVia: createdVia || (channel === 'whatsapp' ? 'agent' : 'receptionist'),
        isTelemedicine: body.modality === 'video',
        modality: body.modality || 'in_clinic',
      },
    })

    // Fee breakdown
    await db.appointmentFees.create({
      data: {
        appointmentId: appt.id,
        baseDoctorFee: fees.doctorFee,
        clinicMarkup: fees.clinicMarkup,
        platformFee: fees.platformFee,
        platformFeeOverride: platformFeeOverride,
        total: discountedFees.total,
        discount: discount.discountAmount,
        currency: 'PKR',
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

    // Debit platform fee from clinic credit ledger
    if (clinicRule?.billingMode !== 'invoice') {
      const platformCharge = Math.max(0, discountedFees.platformFee - discount.discountAmount)
      const lastEntry = await db.creditLedger.findFirst({ where: { clinicId }, orderBy: { createdAt: 'desc' } })
      const balanceAfter = (lastEntry?.balanceAfter ?? 0) - platformCharge
      await db.creditLedger.create({
        data: {
          clinicId,
          type: 'debit',
          amount: platformCharge,
          reason: 'appointment_fee',
          appointmentId: appt.id,
          balanceAfter,
        },
      })
      // Update clinic balance
      await db.clinic.update({ where: { id: clinicId }, data: { creditBalance: balanceAfter } })

      // Check low-balance threshold (founder doc §24)
      const { checkLowBalance } = await import('@/lib/low-balance')
      await checkLowBalance(clinicId)
    }

    // Broadcast realtime
    store.publish(`clinic:${clinicId}:queue`, { type: 'slot_booked', appointmentId: appt.id, slotId, patientName: patient.name, doctorId })

    // Schedule reminders (T-24h, T-2h, T-30min) — for future appointments
    const now = Date.now()
    const startMs = start.getTime()
    const offsets = [
      { type: 'reminder_24h', ms: 24 * 60 * 60 * 1000 },
      { type: 'reminder_2h', ms: 2 * 60 * 60 * 1000 },
      { type: 'reminder_30min', ms: 30 * 60 * 1000 },
    ]
    for (const o of offsets) {
      const sendAt = new Date(startMs - o.ms)
      if (sendAt.getTime() > now) {
        await db.reminder.create({
          data: {
            appointmentId: appt.id,
            type: o.type,
            sendAt,
            status: 'pending',
            channel: 'whatsapp',
          },
        })
      }
    }

    await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'appointment_booked', target: appt.id, metadata: { doctorId, slotId, patientId: patient.id, totalFee: fees.total } })

    // ── Google Calendar Sync (async, non-blocking) ──
    syncCalendarEvent(appt.id, clinicId, doctor, patient, start, end, body.modality).catch(() => {})

    return ok({
      appointmentId: appt.id,
      patient: { id: patient.id, name: patient.name, phone: decryptPhone(patient.phone) },
      slot: { id: slot.id, startTime: slot.startTime, endTime: slot.endTime, tokenNo: slot.tokenNo },
      fees,
    })
  } finally {
    store.releaseLock(`slot:${slotId}`, lockToken)
  }
}

export const GET = handle(list)
export const POST = handle(book)

// ── Google Calendar + Meet Sync ──
// Fire-and-forget: sync calendar event and optionally create Meet link.
// Failures are non-blocking — the appointment is already booked in DB.

async function syncCalendarEvent(
  appointmentId: string,
  clinicId: string,
  doctor: { name: string; email?: string | null },
  patient: { name: string | null; email?: string | null },
  start: Date,
  end: Date,
  modality?: string,
) {
  try {
    const calResult = await resolveCalendarProvider(clinicId)
    if (!calResult) return

    const attendees: { email: string; displayName?: string }[] = []
    if (doctor.email) attendees.push({ email: doctor.email, displayName: doctor.name })
    if (patient.email) attendees.push({ email: patient.email, displayName: patient.name || undefined })

    let conferenceData: { createRequest: { requestId: string; conferenceSolutionKey: { type: 'hangoutsMeet' } } } | undefined
    if (modality === 'video') {
      const meetResult = await resolveMeetingProvider(clinicId)
      if (meetResult.type === 'google_meet') {
        conferenceData = {
          createRequest: {
            requestId: `appt-${appointmentId}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' as const },
          },
        }
      }
    }

    const event = await calResult.provider.createEvent({
      summary: `${doctor.name} — ${patient.name || 'Patient'}`,
      start,
      end,
      attendees,
      timezone: 'Asia/Karachi',
      conferenceData,
      metadata: { appointmentId, clinicId },
    })

    // If Meet link was generated, store it on the appointment
    if (event.meetLink) {
      await db.appointment.update({
        where: { id: appointmentId },
        data: { meetLink: event.meetLink },
      })
    }
  } catch (e) {
    console.error('Calendar sync failed for appointment', appointmentId, e)
  }
}

