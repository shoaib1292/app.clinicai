import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, notFound, handle } from '@/lib/api'

async function updateTest(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, session } = await requireClinicScope()
  const { id } = await params
  const body = await req.json() as { name?: string; category?: string; price?: number; turnaroundHrs?: number; specimenType?: string; description?: string; isActive?: boolean }

  const test = await db.labTest.findFirst({ where: { id, clinicId } })
  if (!test) return notFound()

  const updated = await db.labTest.update({
    where: { id },
    data: { ...body, name: body.name?.trim() },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'lab_test_updated', target: id })
  return ok(updated)
}

async function deleteTest(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, session } = await requireClinicScope()
  const { id } = await params

  const test = await db.labTest.findFirst({ where: { id, clinicId } })
  if (!test) return notFound()

  await db.labTest.update({ where: { id }, data: { isActive: false } })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'lab_test_deleted', target: id })
  return ok({ deleted: true })
}

export const PATCH = handle(updateTest)
export const DELETE = handle(deleteTest)
