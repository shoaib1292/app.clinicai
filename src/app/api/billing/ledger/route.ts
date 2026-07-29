import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

// GET /api/billing/ledger — credit ledger entries for the current clinic
async function list(_req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const ledger = await db.creditLedger.findMany({
    where: { clinicId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return ok(ledger)
}

export const GET = handle(list)
