import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { validatePromoCode } from '@/lib/discounts'
import { ok, err, handle } from '@/lib/api'

// Public endpoint — no auth required. Uses clinicId from promo code lookup.
async function validate(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { code, clinicId } = body as { code?: string; clinicId?: string }

  if (!code) return err('Promo code is required', 400)

  // If clinicId provided, scope to that clinic; otherwise find from the offer
  if (!clinicId) {
    const offer = await db.offer.findUnique({ where: { promoCode: code.toUpperCase() }, select: { clinicId: true } })
    if (!offer) return ok({ ok: false, error: 'Invalid promo code' })
    const result = await validatePromoCode({ clinicId: offer.clinicId, code })
    return ok({ ok: !result.error, ...result })
  }

  const result = await validatePromoCode({ clinicId, code })
  return ok({ ok: !result.error, ...result })
}

export const POST = handle(validate)
