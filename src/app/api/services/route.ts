import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/services  — clinic-scoped list (any clinic user)
async function list(_req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const services = await db.service.findMany({
    where: { clinicId },
    orderBy: { createdAt: 'desc' },
    include: { doctor: { select: { id: true, name: true } }, _count: { select: { appointments: true } } },
  })
  return ok(services)
}

// POST /api/services — create new service
async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json().catch(() => ({}))
  const { name, durationMin, baseFee, doctorId, description } = body as {
    name?: string; durationMin?: number; baseFee?: number; doctorId?: string; description?: string
  }
  if (!name) return err('name required', 400)

  // Validate doctorId if provided
  if (doctorId) {
    const doc = await db.doctor.findFirst({ where: { id: doctorId, clinicId } })
    if (!doc) return err('Doctor not found in this clinic', 404)
  }

  const service = await db.service.create({
    data: {
      clinicId,
      name,
      durationMin: durationMin ?? 15,
      baseFee: baseFee ?? 0,
      doctorId: doctorId || null,
      description: description || null,
      active: true,
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'service_created',
    target: service.id,
    metadata: { name, baseFee, doctorId },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(service)
}

export const GET = handle(list)
export const POST = handle(create)
