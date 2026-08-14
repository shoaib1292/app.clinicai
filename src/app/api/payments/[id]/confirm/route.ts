import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// POST /api/payments/[id]/confirm
// Confirms a pending PaymentProof:
//   - clinic_topup   → create a CreditLedger credit entry + bump clinic.creditBalance
//   - patient_payment → mark linked appointment.paymentStatus = 'paid'
async function confirm(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

  let session
  let clinicId: string | undefined

  // Allow platform finance/admin OR clinic-scoped (clinic_admin/receptionist)
  try {
    session = await requireType('platform_admin', 'platform_staff')
    // Platform users must specify a clinicId via the proof itself
  } catch {
    const cs = await requireClinicScope()
    session = cs.session
    clinicId = cs.clinicId
  }

  const proof = await db.paymentProof.findUnique({
    where: { id },
    include: { clinic: true, appointment: true },
  })
  if (!proof) return err('Payment proof not found', 404)

  // Enforce clinic scoping for non-platform users
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    if (proof.clinicId !== clinicId) return err('Forbidden', 403)
    // Receptionists can only confirm patient_payment, not clinic_topup
    if (session.type === 'receptionist' && proof.ledgerType === 'clinic_topup') {
      return err('Receptionists cannot confirm clinic top-ups', 403)
    }
  } else {
    // Platform finance/admin: restrict to finance role for actual confirm
    if (session.type === 'platform_staff' && session.role !== 'finance' && session.role !== 'support') {
      return err('Only finance/support platform staff can confirm proofs', 403)
    }
  }

  if (proof.status !== 'pending') return err(`Proof already ${proof.status}`, 409)

  // -------- Apply confirmation --------
  if (proof.ledgerType === 'clinic_topup') {
    // Credit the clinic wallet
    const lastEntry = await db.creditLedger.findFirst({
      where: { clinicId: proof.clinicId },
      orderBy: { createdAt: 'desc' },
    })
    const balanceAfter = (lastEntry?.balanceAfter ?? proof.clinic.creditBalance) + proof.amount

    await db.creditLedger.create({
      data: {
        clinicId: proof.clinicId,
        type: 'credit',
        amount: proof.amount,
        reason: 'topup',
        paymentProofId: proof.id,
        balanceAfter,
      },
    })
    await db.clinic.update({
      where: { id: proof.clinicId },
      data: { creditBalance: balanceAfter },
    })
  } else if (proof.ledgerType === 'patient_payment') {
    // Mark linked appointment as paid
    if (proof.appointmentId) {
      await db.appointment.update({
        where: { id: proof.appointmentId },
        data: { paymentStatus: 'paid' },
      })
    }
  }

  const updated = await db.paymentProof.update({
    where: { id },
    data: {
      status: 'confirmed',
      confirmedBy: session.sub,
      confirmedAt: new Date(),
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: proof.clinicId,
    action: 'payment_proof_confirmed',
    target: proof.id,
    metadata: { amount: proof.amount, ledgerType: proof.ledgerType, appointmentId: proof.appointmentId },
    ip,
  })

  return ok(updated)
}

export const POST = handle(confirm)
