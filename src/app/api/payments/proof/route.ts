import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/payments/proof?all=true
//   - all=true (platform finance/admin only): all proofs across clinics
//   - otherwise: clinic-scoped proofs for the current user's clinic
async function list(req: NextRequest) {
  const url = new URL(req.url)
  const all = url.searchParams.get('all') === 'true'
  const status = url.searchParams.get('status')
  const ledgerType = url.searchParams.get('ledgerType')

  // For "all", require platform role
  if (all) {
    await requireType('platform_admin', 'platform_staff')
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (ledgerType) where.ledgerType = ledgerType
    const proofs = await db.paymentProof.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: { clinic: { select: { id: true, name: true } }, appointment: { select: { id: true, start: true, patient: { select: { name: true, phone: true } } } } },
    })
    return ok(proofs)
  }

  // Clinic-scoped
  const { clinicId } = await requireClinicScope()
  const where: Record<string, unknown> = { clinicId }
  if (status) where.status = status
  if (ledgerType) where.ledgerType = ledgerType
  const proofs = await db.paymentProof.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: { appointment: { select: { id: true, start: true, patient: { select: { name: true, phone: true } } } } },
  })
  return ok(proofs)
}

// POST /api/payments/proof  — upload a new payment proof (pending status)
async function upload(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { clinicId, appointmentId, ledgerType, amount, payerName, payerPhone, screenshotUrl, uploadedBy } = body as {
    clinicId?: string
    appointmentId?: string
    ledgerType?: string
    amount?: number
    payerName?: string
    payerPhone?: string
    screenshotUrl?: string
    uploadedBy?: string
  }

  if (!ledgerType || !amount || !payerName) return err('ledgerType, amount, payerName required', 400)
  if (!['clinic_topup', 'patient_payment'].includes(ledgerType)) return err('Invalid ledgerType', 400)
  if (amount <= 0) return err('amount must be > 0', 400)

  // Resolve clinic context
  let resolvedClinicId = clinicId
  let session
  let actorType: string = 'unknown'
  let actorId: string | undefined

  // Allow platform admin/staff OR clinic-scoped user
  try {
    session = await requireType('platform_admin', 'platform_staff')
    actorType = session.type
    actorId = session.sub
    if (!resolvedClinicId) return err('clinicId required for platform upload', 400)
  } catch {
    const cs = await requireClinicScope()
    session = cs.session
    actorType = session.type
    actorId = session.sub
    resolvedClinicId = cs.clinicId
    if (clinicId && clinicId !== resolvedClinicId) return err('Cannot upload proof for another clinic', 403)
  }

  // Validate appointment linkage if patient_payment
  if (ledgerType === 'patient_payment') {
    if (!appointmentId) return err('appointmentId required for patient_payment', 400)
    const appt = await db.appointment.findFirst({ where: { id: appointmentId, clinicId: resolvedClinicId } })
    if (!appt) return err('Appointment not found', 404)
  }

  const shot = screenshotUrl || `/uploads/proof-${Date.now()}.png`

  // If appointmentId provided, ensure no existing proof (PaymentProof.appointmentId is unique)
  if (appointmentId) {
    const existing = await db.paymentProof.findUnique({ where: { appointmentId } })
    if (existing) return err('A payment proof already exists for this appointment', 409)
  }

  const proof = await db.paymentProof.create({
    data: {
      clinicId: resolvedClinicId,
      appointmentId: appointmentId || null,
      ledgerType,
      amount: Number(amount),
      payerName,
      payerPhone: payerPhone || null,
      screenshotUrl: shot,
      uploadedBy: uploadedBy || actorType,
      status: 'pending',
    },
  })

  await auditLog({
    actorId,
    actorType,
    clinicId: resolvedClinicId,
    action: 'payment_proof_uploaded',
    target: proof.id,
    metadata: { amount: proof.amount, ledgerType, appointmentId },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(proof)
}

export const GET = handle(list)
export const POST = handle(upload)
