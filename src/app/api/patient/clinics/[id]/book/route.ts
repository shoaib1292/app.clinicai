/**
 * POST /api/patient/clinics/[id]/book
 * Patient books an appointment via the app.
 * Mirrors the public/book route but with patient auth + auto-patient-attach.
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

async function book(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clinicId } = await params
  const { appUserId } = await requirePatientAuth(req)

  const body = (await req.json().catch(() => ({}))) as {
    doctorId?: string
    slotId?: string
    serviceId?: string
    paymentMode?: string
    paymentProof?: string
  }

  const { doctorId, slotId, serviceId } = body
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

    const phoneHash = hashPhone(appUser.phone + clinicId)
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

    // ── Compute fees ──
    const fees = computeFees(doctor, slot)

    // ── Create appointment ──
    const appt = await db.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        doctorId,
        slotId,
        start: slot.startTime,
        status: 'booked',
        serviceId: serviceId || null,
        paymentMode: body.paymentMode || 'screenshot',
        totalFee: fees.total,
        doctorFee: fees.doctorFee,
        platformFee: fees.platformFee,
      },
    })

    // ── Mark slot as booked ──
    await db.slot.update({
      where: { id: slotId },
      data: { status: 'booked', patientId: patient.id, appointmentId: appt.id },
    })

    // ── Create single 30-min reminder ──
    await db.reminder.create({
      data: {
        appointmentId: appt.id,
        type: 'reminder_30min',
        sendAt: new Date(slot.startTime.getTime() - 30 * 60 * 1000),
        status: 'pending',
        channel: 'whatsapp',
      },
    })

    // ── Credit debit ──
    const clinicRecord = await db.clinic.findUnique({ where: { id: clinicId }, select: { creditBalance: true } })
    const newBalance = (clinicRecord?.creditBalance ?? 0) - fees.platformFee
    await db.clinic.update({ where: { id: clinicId }, data: { creditBalance: Math.max(0, newBalance) } })

    // ── Publish event ──
    publishAppointmentBooked(clinicId, {
      id: appt.id,
      status: 'booked',
      patientId: patient.id,
      patientName: patient.name || 'Patient',
      doctorId,
      start: slot.startTime,
    })

    await store.publish(`clinic:${clinicId}:queue`, {
      type: 'slot_booked',
      appointmentId: appt.id,
      slotId,
      patientId: patient.id,
      doctorId,
    })

    return ok({
      appointmentId: appt.id,
      start: slot.startTime,
      doctor: doctor.name,
      tokenNo: slot.tokenNo,
    })
  } finally {
    await store.releaseLock(`slot:${slotId}`, lockToken)
  }
}

export const POST = handle(book)
