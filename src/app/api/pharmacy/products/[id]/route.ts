import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// PATCH /api/pharmacy/products/[id]
async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const b = await req.json().catch(() => ({}))
  const product = await db.pharmacyProduct.findFirst({ where: { id, clinicId } })
  if (!product) return err('Product not found', 404)

  const data: Record<string, unknown> = {}
  for (const k of ['name', 'genericName', 'brand', 'form', 'strength', 'unit']) {
    if (k in b) data[k] = b[k] ?? null
  }
  for (const k of ['purchasePrice', 'salePrice', 'taxRate', 'reorderLevel']) {
    if (k in b) data[k] = Number(b[k]) || 0
  }
  if ('active' in b) data.active = Boolean(b.active)

  const updated = await db.pharmacyProduct.update({ where: { id }, data })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_product_updated', target: id, metadata: b })
  return ok(updated)
}

// DELETE /api/pharmacy/products/[id] (soft delete)
async function del(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const product = await db.pharmacyProduct.findFirst({ where: { id, clinicId } })
  if (!product) return err('Product not found', 404)
  await db.pharmacyProduct.update({ where: { id }, data: { deletedAt: new Date(), active: false } })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_product_deleted', target: id })
  return ok({ id })
}

export const PATCH = handle(patch)
export const DELETE = handle(del)
