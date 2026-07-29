import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/pharmacy/stock -> batches with product + low-stock / expiry flags
async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const low = url.searchParams.get('low') === '1'
  const expiring = url.searchParams.get('expiring') === '1' // expiry within 90 days
  const productId = url.searchParams.get('productId')

  const where: Record<string, unknown> = { clinicId, quantity: { gt: 0 } }
  if (productId) where.productId = productId
  if (low || expiring) {
    // Need product reorderLevel + batch expiry; filter in-memory after fetch.
  }

  const batches = await db.pharmacyStockBatch.findMany({
    where,
    orderBy: [{ expiry: 'asc' }, { receivedAt: 'asc' }],
    include: { product: { select: { id: true, name: true, reorderLevel: true, form: true, unit: true, salePrice: true } }, supplier: { select: { id: true, name: true } } },
  })

  const now = Date.now()
  const in90 = now + 90 * 24 * 60 * 60 * 1000
  const filtered = batches.filter((b: any) => {
    if (low && b.product.reorderLevel > 0 && b.quantity > b.product.reorderLevel) return false
    if (expiring) {
      if (!b.expiry) return false
      const t = new Date(b.expiry).getTime()
      if (t < now || t > in90) return false
    }
    return true
  })

  return ok(filtered)
}

// POST /api/pharmacy/stock -> stock-in (create batch). Optionally link a PO.
async function stockIn(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const b = await req.json().catch(() => ({}))
  const { productId, batchNo, expiry, quantity, costPrice, supplierId, purchaseOrderId } = b
  if (!productId || !quantity) return err('productId and quantity required', 400)
  const product = await db.pharmacyProduct.findFirst({ where: { id: productId, clinicId } })
  if (!product) return err('Product not found', 404)

  const batch = await db.pharmacyStockBatch.create({
    data: {
      clinicId,
      productId,
      batchNo: batchNo || null,
      expiry: expiry ? new Date(expiry) : null,
      quantity: Number(quantity),
      costPrice: Number(costPrice) || 0,
      supplierId: supplierId || null,
    },
  })

  // Recompute product avg purchase price.
  const agg = await db.pharmacyStockBatch.aggregate({ where: { productId, clinicId, quantity: { gt: 0 } }, _avg: { costPrice: true }, _sum: { quantity: true } })
  if (agg._sum.quantity && agg._avg.costPrice != null) {
    await db.pharmacyProduct.update({ where: { id: productId }, data: { purchasePrice: Math.round(agg._avg.costPrice) } })
  }

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_stock_in', target: batch.id, metadata: b })
  return ok(batch)
}

export const GET = handle(list)
export const POST = handle(stockIn)
