import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { uploadImage } from '@/lib/storage'
import { sendWhatsAppText } from '@/lib/notifications'

// POST /api/payments/public-proof  (public, token-based)
// Used by the public payment page (booking link) so a patient can upload a
// transfer screenshot for their appointment. No auth — anyone with the token.
// Body (multipart): token, amount, payerName, file
async function upload(req: NextRequest) {
  const fd = await req.formData()
  const token = fd.get('token') as string || undefined
  const amount = Number(fd.get('amount') as string) || undefined
  const payerName = (fd.get('payerName') as string) || 'Patient'
  const file = fd.get('file') as File | null

  if (!token) return err('token required', 400)
  if (!amount || amount <= 0) return err('valid amount required', 400)

  const paymentToken = await db.paymentToken.findUnique({
    where: { token, deletedAt: null },
    include: { appointment: { include: { patient: true } }, clinic: true },
  })
  if (!paymentToken) return err('Invalid payment token', 404)
  if (paymentToken.status !== 'pending') return err('Payment already processed', 409)

  const appointmentId = paymentToken.appointmentId
  if (!appointmentId) return err('Token not linked to an appointment', 400)

  // One proof per appointment
  const existing = await db.paymentProof.findUnique({ where: { appointmentId } })
  if (existing) return err('A payment proof already exists for this appointment', 409)

  let screenshotUrl: string | undefined
  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer())
    screenshotUrl = await uploadImage(buf, 'clinicai/payment-proofs')
  }

  const proof = await db.paymentProof.create({
    data: {
      clinicId: paymentToken.clinicId,
      appointmentId,
      ledgerType: 'patient_payment',
      amount,
      payerName,
      payerPhone: paymentToken.appointment?.patient?.phone || null,
      screenshotUrl: screenshotUrl || `/uploads/proof-${Date.now()}.png`,
      uploadedBy: 'patient',
      status: 'pending',
    },
  })

  // Notify the clinic (admin + receptionists) that a patient uploaded a
  // transfer proof and it needs verification before the appointment is
  // confirmed. Fire-and-forget — failures are logged, not thrown.
  try {
    const clinic = await db.clinic.findUnique({
      where: { id: paymentToken.clinicId },
      select: { name: true, admins: { select: { phone: true } }, receptionists: { select: { phone: true } } },
    })
    const phones = [
      ...(clinic?.admins ?? []).map((a) => a.phone).filter(Boolean),
      ...(clinic?.receptionists ?? []).map((r) => r.phone).filter(Boolean),
    ] as string[]
    const patientName = paymentToken.appointment?.patient?.name || payerName
    const notifyMsg = `💳 New payment proof received\nPatient: ${patientName}\nAmount: PKR ${amount}\n\nPlease verify the screenshot in the dashboard to confirm the appointment.`
    for (const phone of phones) {
      await sendWhatsAppText(paymentToken.clinicId, phone, notifyMsg)
    }
  } catch (e) {
    console.error('[public-proof] clinic notify failed', e)
  }

  return ok(proof)
}

export const POST = handle(upload)
