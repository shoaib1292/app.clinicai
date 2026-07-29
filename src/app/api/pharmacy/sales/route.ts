import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { recordPharmacySale, type PharmacySaleLine } from '@/lib/pharmacy-billing'

// GET /api/pharmacy/sales -> paginated counter sales
async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const cursor = url.searchParams.get('cursor')
  const limit = Number(url.searchParams.get('limit') || '50')

  const where: Record<string, unknown> = {
    clinicId,
    ...(status ? { paymentStatus: status } : {}),
    ...(from ? { createdAt: { gte: new Date(from) } } : {}),
    ...(to ? { createdAt: { lte: new Date(to) } } : {}),
  }

  const sales = await db.pharmacySale.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100) + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      prescription: { select: { id: true } },
      items: { include: { product: { select: { id: true, name: true, form: true, unit: true } } } },
    },
  })
  const hasMore = sales.length > limit
  const data = sales.slice(0, limit)
  const nextCursor = hasMore ? data[data.length - 1].id : null
  return ok({ items: data, nextCursor, hasMore })
}

// POST /api/pharmacy/sales -> dispense + bill from the counter.
// Body: {
//   patientId?, prescriptionId?, appointmentId?,
//   channel?, paymentMode?, discount?, tax?,
//   items: [{ productId, quantity, unitPrice, batchId? }]
// }
async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const b = await req.json().catch(() => ({}))
  const items = Array.isArray(b.items) ? b.items : []
  if (items.length === 0) return err('items required', 400)

  // Validate products + resolve cost for FIFO/platform-fee margin.
  const productIds = items.map((i: any) => i.productId)
  const products = await db.pharmacyProduct.findMany({ where: { id: { in: productIds }, clinicId } })
  if (products.length !== new Set(productIds).size) return err('Invalid product in items', 400)

  const lines: PharmacySaleLine[] = []
  let costTotal = 0
  for (const i of items) {
    const qty = Number(i.quantity)
    if (qty <= 0) return err('quantity must be > 0', 400)
    const unitPrice = Number(i.unitPrice) || 0
    lines.push({ productId: i.productId, batchId: i.batchId ?? null, quantity: qty, unitPrice, lineTotal: qty * unitPrice })

    // Cost: use provided batch cost, else product avg purchase price.
    let cost = 0
    if (i.batchId) {
      const batch = await db.pharmacyStockBatch.findFirst({ where: { id: i.batchId, clinicId } })
      cost = (batch?.costPrice ?? 0) * qty
    } else {
      const p = products.find((x) => x.id === i.productId)
      cost = (p?.purchasePrice ?? 0) * qty
    }
    costTotal += cost
  }

  const result = await recordPharmacySale({
    clinicId,
    patientId: b.patientId ?? null,
    prescriptionId: b.prescriptionId ?? null,
    appointmentId: b.appointmentId ?? null,
    channel: b.channel ?? 'counter',
    paymentMode: b.paymentMode ?? 'cash',
    paymentStatus: b.paymentStatus ?? 'pending',
    createdByStaffId: session.sub,
    lines,
    discount: Number(b.discount) || 0,
    tax: Number(b.tax) || 0,
    costTotal,
  })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_sale_created', target: result.saleId, metadata: { ...b, platformFee: result.platformFee } })
  return ok(result)
}

export const GET = handle(list)
export const POST = handle(create)
