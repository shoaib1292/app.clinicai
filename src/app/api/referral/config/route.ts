import { NextRequest } from 'next/server'
import { requireClinicScope, auditLog } from '@/lib/session'
import { getReferralProgram, upsertReferralProgram } from '@/lib/discounts'
import { ok, err, handle } from '@/lib/api'

async function get(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const program = await getReferralProgram(clinicId)
  return ok(program)
}

async function patch(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json().catch(() => ({}))
  const { enabled, refereeDiscount, referrerReward } = body as {
    enabled?: boolean; refereeDiscount?: number; referrerReward?: number
  }

  const program = await upsertReferralProgram(clinicId, { enabled, refereeDiscount, referrerReward })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'referral_config_updated' })
  return ok(program)
}

export const GET = handle(get)
export const PATCH = handle(patch)
