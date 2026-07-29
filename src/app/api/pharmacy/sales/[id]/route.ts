import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/pharmacy/sales/[id]
async function get(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params
  const sale = await db.pharmacySale.findFirst({
    where: { id, clinicId },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      prescription: { include: { items: { include: { product: true } } } },
      appointment: { select: { id: true, totalFee: true } },
      items: { include: { product: { select: { id: true, name: true, form: true, unit: true } }, batch: { select: { id: true, batchNo: true, expiry: true } } } },
    },
  })
  if (!sale) return err('Sale not found', 404)
  return ok(sale)
}

// PATCH /api/pharmacy/sales/[id] -> update payment status / mode
async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const b = await req.json().catch(() => ({}))
  const sale = await db.pharmacySale.findFirst({ where: { id, clinicId } })
  if (!sale) return err('Sale not found', 404)

  const data: Record<string, unknown> = {}
  if ('paymentStatus' in b) data.paymentStatus = b.paymentStatus
  if ('paymentMode' in b) data.paymentMode = b.paymentMode
  const updated = await db.pharmacySale.update({ where: { id }, data })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_sale_updated', target: id, metadata: b })
  return ok(updated)
}

export const GET = handle(get)
export const PATCH = handle(patch)
