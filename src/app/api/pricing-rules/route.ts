import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function list() {
  await requireType('platform_admin', 'platform_staff')
  const rules = await db.pricingRule.findMany({
    orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
    include: { clinic: { select: { name: true, slug: true } } },
  })
  return ok(rules)
}

async function create(req: NextRequest) {
  const session = await requireType('platform_admin')
  const body = await req.json()
  const { scope, clinicId, platformFeeDefault, platformFeeOverride, markupMin, markupMax, billingMode } = body
  if (!scope) return err('Scope required', 400)
  const rule = await db.pricingRule.create({
    data: {
      scope,
      clinicId: scope === 'clinic' ? clinicId : null,
      platformFeeDefault: platformFeeDefault ?? 50,
      platformFeeOverride: platformFeeOverride ?? null,
      markupMin: markupMin ?? 0,
      markupMax: markupMax ?? 500,
      billingMode: billingMode ?? 'credit',
      createdById: session.sub,
    },
  })
  await auditLog({ actorId: session.sub, actorType: 'platform_admin', action: 'pricing_rule_created', target: rule.id, metadata: body })
  return ok(rule)
}

export const GET = handle(list)
export const POST = handle(create)
