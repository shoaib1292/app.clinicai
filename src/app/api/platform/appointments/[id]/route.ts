import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('platform_admin', 'platform_staff')
  const body = await req.json()
  const { status, notes, staffId } = body

  const appt = await db.platformAppointment.update({
    where: { id },
    data: {
      status: status ?? undefined,
      notes: notes ?? undefined,
      staffId: staffId ?? undefined,
    },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, action: 'platform_appt_updated', target: id, metadata: { status, notes } })
  return ok(appt)
}

async function deleteAppt(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('platform_admin', 'platform_staff')
  await db.platformAppointment.update({ where: { id }, data: { status: 'cancelled' } })
  await auditLog({ actorId: session.sub, actorType: session.type, action: 'platform_appt_cancelled', target: id })
  return ok({ ok: true })
}

export const PATCH = handle(patch)
export const DELETE = handle(deleteAppt)
