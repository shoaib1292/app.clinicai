import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function list(req: NextRequest) {
  const session = await requireType('platform_admin', 'platform_staff')
  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const appts = await db.platformAppointment.findMany({
    where: {
      AND: [
        from ? { start: { gte: new Date(from) } } : {},
        to ? { end: { lte: new Date(to) } } : {},
      ],
    },
    orderBy: { start: 'asc' },
    include: {
      staff: { select: { id: true, name: true, role: true } },
      admin: { select: { id: true, name: true } },
      clinic: { select: { id: true, name: true, slug: true } },
    },
  })
  return ok(appts)
}

async function create(req: NextRequest) {
  const session = await requireType('platform_admin', 'platform_staff')
  const body = await req.json()
  const { staffId, clinicId, purpose, start, end, location, notes } = body
  if (!purpose || !start || !end) return err('Missing fields', 400)

  // Conflict check
  const conflict = await db.platformAppointment.findFirst({
    where: {
      staffId: staffId || null,
      status: 'scheduled',
      OR: [
        { start: { lte: new Date(start) }, end: { gt: new Date(start) } },
        { start: { lt: new Date(end) }, end: { gte: new Date(end) } },
      ],
    },
  })
  if (conflict) return err('Conflict: staff already booked in this window', 409)

  const meetLink = location === 'online' ? `https://meet.clinicsai.pk/${Math.random().toString(36).slice(2, 10)}` : null

  const appt = await db.platformAppointment.create({
    data: {
      staffId: staffId || null,
      adminId: session.type === 'platform_admin' ? session.sub : null,
      clinicId,
      purpose,
      start: new Date(start),
      end: new Date(end),
      location: location || 'online',
      meetLink,
      notes,
      status: 'scheduled',
    },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, action: 'platform_appt_created', target: appt.id, metadata: body })
  return ok(appt)
}

export const GET = handle(list)
export const POST = handle(create)
