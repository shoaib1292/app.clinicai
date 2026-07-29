import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// POST /api/payments/[id]/reject  body: { reason }
async function reject(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const reason = (body?.reason || 'Rejected by reviewer').toString().slice(0, 500)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

  let session
  let clinicId: string | undefined

  try {
    session = await requireType('platform_admin', 'platform_staff')
  } catch {
    const cs = await requireClinicScope()
    session = cs.session
    clinicId = cs.clinicId
  }

  const proof = await db.paymentProof.findUnique({ where: { id } })
  if (!proof) return err('Payment proof not found', 404)

  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    if (proof.clinicId !== clinicId) return err('Forbidden', 403)
    if (session.type === 'receptionist' && proof.ledgerType === 'clinic_topup') {
      return err('Receptionists cannot reject clinic top-ups', 403)
    }
  } else {
    if (session.type === 'platform_staff' && session.role !== 'finance' && session.role !== 'support') {
      return err('Only finance/support platform staff can reject proofs', 403)
    }
  }

  if (proof.status !== 'pending') return err(`Proof already ${proof.status}`, 409)

  const updated = await db.paymentProof.update({
    where: { id },
    data: {
      status: 'rejected',
      notes: reason,
      confirmedBy: session.sub,
      confirmedAt: new Date(),
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: proof.clinicId,
    action: 'payment_proof_rejected',
    target: proof.id,
    metadata: { amount: proof.amount, ledgerType: proof.ledgerType, reason },
    ip,
  })

  return ok(updated)
}

export const POST = handle(reject)
