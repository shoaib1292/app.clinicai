import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// List schedules for a doctor
async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  if (!doctorId) return err('doctorId required', 400)

  const doctor = await db.doctor.findFirst({ where: { id: doctorId, clinicId } })
  if (!doctor) return err('Doctor not found', 404)

  const schedules = await db.schedule.findMany({
    where: { doctorId },
    orderBy: { dayOfWeek: 'asc' },
  })
  return ok(schedules)
}

// Create a schedule override (leave/block/emergency)
async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json()
  const { doctorId, date, type, startTime, endTime, reason } = body
  if (!doctorId || !date || !type) return err('doctorId, date, type required', 400)

  const doctor = await db.doctor.findFirst({ where: { id: doctorId, clinicId } })
  if (!doctor) return err('Doctor not found', 404)

  const override = await db.scheduleOverride.create({
    data: {
      doctorId,
      date: new Date(date),
      type, // leave | block | emergency
      startTime: startTime || null,
      endTime: endTime || null,
      reason: reason || null,
    },
  })

  // If leave, set doctor status to off
  if (type === 'leave') {
    await db.doctor.update({ where: { id: doctorId }, data: { currentStatus: 'off' } })
  }

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'schedule_override_created',
    target: override.id,
    metadata: { doctorId, date, type, startTime, endTime, reason },
  })

  return ok(override)
}

export const GET = handle(list)
export const POST = handle(create)
