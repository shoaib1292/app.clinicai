import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/pharmacy/products -> paginated catalog
async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  const activeOnly = url.searchParams.get('active') === '1'
  const cursor = url.searchParams.get('cursor')
  const limit = Number(url.searchParams.get('limit') || '50')

  const where: Record<string, unknown> = {
    clinicId,
    ...(activeOnly ? { active: true } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { genericName: { contains: q, mode: 'insensitive' } }, { brand: { contains: q, mode: 'insensitive' } }] } : {}),
  }

  const items = await db.pharmacyProduct.findMany({
    where,
    orderBy: { name: 'asc' },
    take: Math.min(limit, 100) + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { stockBatches: true, saleItems: true } },
      stockBatches: { where: { quantity: { gt: 0 } }, orderBy: { expiry: 'asc' }, select: { id: true, quantity: true, expiry: true, batchNo: true } },
    },
  })
  const hasMore = items.length > limit
  const data = items.slice(0, limit)
  const nextCursor = hasMore ? data[data.length - 1].id : null

  // Live stock total
  const withStock = await Promise.all(
    data.map(async (p: any) => {
      const agg = await db.pharmacyStockBatch.aggregate({ where: { productId: p.id, clinicId }, _sum: { quantity: true } })
      return { ...p, totalStock: agg._sum.quantity ?? 0 }
    }),
  )

  return ok({ items: withStock, nextCursor, hasMore })
}

// POST /api/pharmacy/products -> create product
async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const b = await req.json().catch(() => ({}))
  const { name, genericName, brand, form, strength, unit, purchasePrice, salePrice, taxRate, reorderLevel } = b
  if (!name) return err('name required', 400)
  const product = await db.pharmacyProduct.create({
    data: {
      clinicId,
      name,
      genericName: genericName || null,
      brand: brand || null,
      form: form || 'tablet',
      strength: strength || null,
      unit: unit || 'strip',
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
      taxRate: Number(taxRate) || 0,
      reorderLevel: Number(reorderLevel) || 0,
    },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_product_created', target: product.id, metadata: b })
  return ok(product)
}

export const GET = handle(list)
export const POST = handle(create)
