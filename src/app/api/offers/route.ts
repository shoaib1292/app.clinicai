import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const offers = await db.offer.findMany({
    where: { clinicId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  })
  return ok(offers)
}

async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json().catch(() => ({}))
  const { title, description, type, value, maxDiscount, appliesTo, serviceId, doctorId, promoCode, startsAt, endsAt, limit } = body as {
    title?: string; description?: string; type?: string; value?: number; maxDiscount?: number
    appliesTo?: string; serviceId?: string; doctorId?: string; promoCode?: string
    startsAt?: string; endsAt?: string; limit?: number
  }

  if (!title) return err('Title is required', 400)
  if (type === 'percent' && (value == null || value < 1 || value > 100)) return err('Percent value must be between 1 and 100', 400)
  if (type === 'flat' && (value == null || value < 1)) return err('Flat discount must be at least 1 PKR', 400)

  if (promoCode) {
    const existing = await db.offer.findUnique({ where: { promoCode: promoCode.toUpperCase() } })
    if (existing) return err('Promo code already in use', 409)
  }

  const offer = await db.offer.create({
    data: {
      clinicId, title, description, type: type || 'percent', value: value ?? 0,
      maxDiscount: maxDiscount || null, appliesTo: appliesTo || 'all',
      serviceId: serviceId || null, doctorId: doctorId || null,
      promoCode: promoCode ? promoCode.toUpperCase() : null,
      startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null,
      limit: limit || null,
    },
  })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'offer_created', target: offer.id, metadata: { title } })
  return ok(offer)
}

export const GET = handle(list)
export const POST = handle(create)
