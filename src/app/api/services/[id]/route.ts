import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/services/[id] — get a single service
async function getService(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params

  const service = await db.service.findFirst({
    where: { id, clinicId },
    include: { doctor: { select: { id: true, name: true } }, _count: { select: { appointments: true } } },
  })
  if (!service) return err('Service not found', 404)

  return ok(service)
}

// PATCH /api/services/[id] — update a service
async function updateService(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const existing = await db.service.findFirst({ where: { id, clinicId } })
  if (!existing) return err('Service not found', 404)

  const { name, durationMin, duration, baseFee, active, doctorId, description } = body as Record<string, unknown>
  const data: Record<string, unknown> = {}
  if (typeof description === 'string') data.description = description
  if (doctorId !== undefined) data.doctorId = doctorId as string

  if (Object.keys(data).length === 0) return err('No valid fields to update', 400)

  const updated = await db.service.update({ where: { id }, data })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'service_updated',
    target: id,
    metadata: data,
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(updated)
}

// DELETE /api/services/[id] — soft-delete a service
async function deleteService(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params

  const existing = await db.service.findFirst({ where: { id, clinicId } })
  if (!existing) return err('Service not found', 404)

  await db.service.update({ where: { id }, data: { deletedAt: new Date(), active: false } })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'service_deleted',
    target: id,
    metadata: { name: existing.name },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ deleted: true })
}

export const GET = handle(getService)
export const PATCH = handle(updateService)
export const DELETE = handle(deleteService)
