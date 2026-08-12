import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, notFound, handle } from '@/lib/api'

async function updateShift(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, session } = await requireClinicScope()
  const { id } = await params
  const body = await req.json() as { label?: string; startTime?: string; endTime?: string }

  const shift = await db.staffShift.findFirst({ where: { id, clinicId } })
  if (!shift) return notFound()

  const updated = await db.staffShift.update({ where: { id }, data: body })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'shift_updated', target: id })
  return ok(updated)
}

async function deleteShift(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, session } = await requireClinicScope()
  const { id } = await params

  const shift = await db.staffShift.findFirst({ where: { id, clinicId } })
  if (!shift) return notFound()

  await db.staffShift.delete({ where: { id } })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'shift_deleted', target: id })
  return ok({ deleted: true })
}

export const PATCH = handle(updateShift)
export const DELETE = handle(deleteShift)
