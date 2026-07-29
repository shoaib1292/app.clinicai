import { NextRequest } from 'next/server'
import { requireType } from '@/lib/session'
import { analyzePendingProofs } from '@/lib/vlm-payment'
import { ok, err, handle } from '@/lib/api'

/**
 * Trigger VLM analysis for all pending proofs that haven't been analyzed yet.
 * Used by the finance dashboard "Analyze all" action. Returns counts.
 */
async function analyze(_req: NextRequest) {
  await requireType('platform_admin', 'platform_staff')
  const result = await analyzePendingProofs()
  return ok(result)
}

export const POST = handle(analyze)
