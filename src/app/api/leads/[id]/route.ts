import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('platform_admin', 'platform_staff')
  const body = await req.json()
  const { status, claimedByStaffId, notes, clinicId } = body

  const lead = await db.lead.update({
    where: { id },
    data: {
      status: status ?? undefined,
      claimedByStaffId: claimedByStaffId ?? (session.type === 'platform_staff' ? session.sub : undefined),
      notes: notes ?? undefined,
      clinicId: clinicId ?? undefined,
    },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, action: 'lead_updated', target: id, metadata: { status, notes } })
  return ok(lead)
}

export const PATCH = handle(patch)
