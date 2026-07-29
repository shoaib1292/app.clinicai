import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/pharmacy/suppliers
async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const suppliers = await db.supplier.findMany({
    where: { clinicId, deletedAt: null },
    orderBy: { name: 'asc' },
    include: { _count: { select: { batches: true, purchaseOrders: true } } },
  })
  return ok(suppliers)
}

// POST /api/pharmacy/suppliers
async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const b = await req.json().catch(() => ({}))
  if (!b.name) return err('name required', 400)
  const supplier = await db.supplier.create({
    data: { clinicId, name: b.name, contact: b.contact || null, city: b.city || null },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_supplier_created', target: supplier.id, metadata: b })
  return ok(supplier)
}

export const GET = handle(list)
export const POST = handle(create)
