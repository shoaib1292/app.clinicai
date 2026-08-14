import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function recordPayment(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()

  const body = await req.json().catch(() => ({}))
  const { patientId, amount, paymentMode, notes, referenceNumber, appointmentId, date } = body as {
    patientId?: string
    amount?: number
    paymentMode?: string
    notes?: string
    referenceNumber?: string
    appointmentId?: string
    date?: string
  }

  if (!patientId || !amount || !paymentMode) {
    return err('patientId, amount, and paymentMode are required', 400)
  }

  const paymentProof = await db.paymentProof.create({
    data: {
      clinicId,
      amount,
      status: 'confirmed',
      ledgerType: appointmentId ? 'patient_payment' : 'clinic_topup',
      payerName: 'Walk-in patient',
      screenshotUrl: `/uploads/offline-${Date.now()}.png`,
      uploadedBy: 'receptionist',
      notes: `Offline payment${notes ? ': ' + notes : ''}${referenceNumber ? ' (Ref: ' + referenceNumber + ')' : ''}`,
      appointmentId: appointmentId || null,
      confirmedAt: new Date(date || new Date()),
      confirmedBy: session.sub,
    },
  })

  // Update appointment if linked
  if (appointmentId) {
    await db.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: 'paid', paymentMode: paymentMode || 'cash' },
    })
  }

  // Add to credit ledger
  await db.creditLedger.create({
    data: {
      clinicId,
      type: 'credit',
      amount,
      reason: appointmentId ? 'appointment_fee' : 'topup',
      balanceAfter: 0,
      paymentProofId: paymentProof.id,
    },
  })

  return ok({ id: paymentProof.id, status: 'confirmed' })
}

async function listPayments(_req: NextRequest) {
  const { clinicId } = await requireClinicScope()

  const payments = await db.paymentProof.findMany({
    where: { clinicId, ledgerType: 'clinic_topup' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return ok(payments)
}

export const GET = handle(listPayments)
export const POST = handle(recordPayment)
