import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/pharmacy/purchases -> purchase orders with items
async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const orders = await db.purchaseOrder.findMany({
    where: { clinicId, deletedAt: null, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, unit: true } } } },
    },
  })
  return ok(orders)
}

// POST /api/pharmacy/purchases -> create PO (draft) or receive immediately.
// Body: { supplierId?, invoiceNo?, status?, items: [{productId, batchNo?, expiry?, quantity, unitCost}] }
async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const b = await req.json().catch(() => ({}))
  const items = Array.isArray(b.items) ? b.items : []
  if (items.length === 0) return err('items required', 400)

  // Validate products belong to clinic.
  const productIds = items.map((i: any) => i.productId)
  const products = await db.pharmacyProduct.findMany({ where: { id: { in: productIds }, clinicId } })
  if (products.length !== new Set(productIds).size) return err('Invalid product in items', 400)

  const status = b.status === 'received' ? 'received' : 'draft'
  const total = items.reduce((s: number, i: any) => s + Number(i.unitCost || 0) * Number(i.quantity || 0), 0)

  const po = await db.purchaseOrder.create({
    data: {
      clinicId,
      supplierId: b.supplierId || null,
      invoiceNo: b.invoiceNo || null,
      total,
      status,
      items: {
        create: items.map((i: any) => ({
          productId: i.productId,
          batchNo: i.batchNo || null,
          expiry: i.expiry ? new Date(i.expiry) : null,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost) || 0,
        })),
      },
    },
    include: { items: true },
  })

  // If received, create stock batches now.
  if (status === 'received') {
    for (const item of po.items) {
      await db.pharmacyStockBatch.create({
        data: {
          clinicId,
          productId: item.productId,
          batchNo: item.batchNo,
          expiry: item.expiry,
          quantity: item.quantity,
          costPrice: item.unitCost,
          supplierId: b.supplierId || null,
        },
      })
    }
    // Recompute avg cost per product.
    for (const pid of productIds) {
      const agg = await db.pharmacyStockBatch.aggregate({ where: { productId: pid, clinicId, quantity: { gt: 0 } }, _avg: { costPrice: true } })
      if (agg._avg.costPrice != null) {
        await db.pharmacyProduct.update({ where: { id: pid }, data: { purchasePrice: Math.round(agg._avg.costPrice) } })
      }
    }
  }

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_purchase_created', target: po.id, metadata: b })
  return ok(po)
}

export const GET = handle(list)
export const POST = handle(create)
