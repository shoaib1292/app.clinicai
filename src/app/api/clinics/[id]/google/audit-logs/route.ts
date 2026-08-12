import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

export const GET = handle(async (_req: NextRequest, _ctx: { params: Promise<{ id: string }> }) => {
  const { clinicId } = await requireClinicScope()

  const logs = await db.googleAuditLog.findMany({
    where: { clinicId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      action: true,
      googleEmail: true,
      metadata: true,
      error: true,
      createdAt: true,
    },
  })

  return ok(logs)
})
