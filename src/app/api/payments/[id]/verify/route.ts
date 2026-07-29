import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// POST /api/payments/[id]/verify
// Two-step verification step 1: clinic admin (or receptionist for patient
// payments) marks a pending proof as `verified`. No balance change — for
// clinic_topup the balance was already credited on submit. Platform finance
// still does the final `confirm`.
async function verify(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

  let session
  let clinicId: string | undefined

  try {
    session = await requireType('platform_admin', 'platform_staff')
    clinicId = undefined
  } catch {
    const cs = await requireClinicScope()
    session = cs.session
    clinicId = cs.clinicId
  }

  const proof = await db.paymentProof.findUnique({
    where: { id },
    include: { clinic: true },
  })
  if (!proof) return err('Payment proof not found', 404)

  // Enforce clinic scoping for non-platform users
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    if (proof.clinicId !== clinicId) return err('Forbidden', 403)
    // Receptionists can only verify patient_payment
    if (session.type === 'receptionist' && proof.ledgerType === 'clinic_topup') {
      return err('Receptionists cannot verify clinic top-ups', 403)
    }
  }

  if (proof.status !== 'pending') return err(`Proof already ${proof.status}`, 409)

  const updated = await db.paymentProof.update({
    where: { id },
    data: {
      status: 'verified',
      verifiedById: session.sub,
      verifiedAt: new Date(),
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: proof.clinicId,
    action: 'payment_proof_verified',
    target: proof.id,
    metadata: { amount: proof.amount, ledgerType: proof.ledgerType, appointmentId: proof.appointmentId },
    ip,
  })

  return ok(updated)
}

export const POST = handle(verify)
