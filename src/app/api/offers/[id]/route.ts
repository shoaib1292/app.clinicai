import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle, notFound } from '@/lib/api'

async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const offer = await db.offer.findFirst({ where: { id, clinicId } })
  if (!offer) return notFound('Offer not found')

  const { title, description, type, value, maxDiscount, appliesTo, serviceId, doctorId, promoCode, startsAt, endsAt, limit, active } = body as Record<string, unknown>

  if (promoCode !== undefined && promoCode && promoCode !== offer.promoCode) {
    const existing = await db.offer.findUnique({ where: { promoCode: String(promoCode).toUpperCase() } })
    if (existing && existing.id !== id) return err('Promo code already in use', 409)
  }

  const updated = await db.offer.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: String(title) } : {}),
      ...(description !== undefined ? { description: description ? String(description) : null } : {}),
      ...(type !== undefined ? { type: String(type) } : {}),
      ...(value !== undefined ? { value: Number(value) } : {}),
      ...(maxDiscount !== undefined ? { maxDiscount: maxDiscount ? Number(maxDiscount) : null } : {}),
      ...(appliesTo !== undefined ? { appliesTo: String(appliesTo) } : {}),
      ...(serviceId !== undefined ? { serviceId: serviceId ? String(serviceId) : null } : {}),
      ...(doctorId !== undefined ? { doctorId: doctorId ? String(doctorId) : null } : {}),
      ...(promoCode !== undefined ? { promoCode: promoCode ? String(promoCode).toUpperCase() : null } : {}),
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(String(startsAt)) : null } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(String(endsAt)) : null } : {}),
      ...(limit !== undefined ? { limit: limit ? Number(limit) : null } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
    },
  })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'offer_updated', target: id })
  return ok(updated)
}

async function remove(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params

  const offer = await db.offer.findFirst({ where: { id, clinicId } })
  if (!offer) return notFound('Offer not found')

  await db.offer.update({ where: { id }, data: { active: false } })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'offer_deleted', target: id })
  return ok({ deleted: true })
}

export const PATCH = handle(patch)
export const DELETE = handle(remove)
