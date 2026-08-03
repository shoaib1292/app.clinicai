import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'
import { ensureSlots } from '@/lib/schedule'

// Set doctor's current_status (in_clinic | break | off | on_way)
async function setStatus(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json()
  const { status, etaMin } = body
  if (!['in_clinic', 'break', 'off', 'on_way'].includes(status)) return err('Invalid status', 400)

  const doctor = await db.doctor.findFirst({ where: { id, clinicId } })
  if (!doctor) return err('Doctor not found', 404)

  await db.doctor.update({ where: { id }, data: { currentStatus: status, statusEta: etaMin ?? null } })

  // Broadcast realtime event
  store.publish(`clinic:${clinicId}:ops`, { type: 'doctor_status_changed', doctorId: id, status, etaMin })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'doctor_status_changed', target: id, metadata: { status, etaMin } })
  return ok({ status })
}

async function getDoctor(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params
  const doctor = await db.doctor.findFirst({
    where: { id, clinicId },
    include: {
      schedules: true,
      scheduleOverrides: { take: 10, orderBy: { date: 'desc' } },
      services: true,
      _count: { select: { appointments: true } },
    },
  })
  if (!doctor) return err('Not found', 404)
  return ok(doctor)
}

async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json()
  const doctor = await db.doctor.findFirst({ where: { id, clinicId } })
  if (!doctor) return err('Not found', 404)

  const workingHoursChanged = !!body.workingHours
  const workingHoursJson = workingHoursChanged ? JSON.stringify(body.workingHours) : undefined

  const updated = await db.doctor.update({ where: { id }, data: {
    name: body.name, gender: body.gender, speciality: body.speciality,
    slotDurationMin: body.slotDurationMin, queueMode: body.queueMode,
    workingHours: workingHoursJson,
    canTelemedicine: body.canTelemedicine,
    telemedicineFee: body.telemedicineFee,
  } })

  // Sync Schedule records and regenerate slots when workingHours change
  if (workingHoursChanged) {
    const wh = JSON.parse(workingHoursJson!)
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    // Delete old schedules and recreate
    await db.schedule.deleteMany({ where: { doctorId: id } })
    for (let dow = 0; dow < 7; dow++) {
      const dayKey = days[dow]
      const day = wh[dayKey]
      if (day) {
        await db.schedule.create({
          data: {
            doctorId: id,
            dayOfWeek: dow,
            startTime: day.start,
            endTime: day.end,
            breakWindows: JSON.stringify(day.breaks || []),
          },
        })
      }
    }

    // Delete future slots and regenerate (schedule changed = old slots invalid)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    await db.slot.deleteMany({ where: { doctorId: id, date: { gte: today }, status: 'open' } })
    await ensureSlots(id, 30)
  }

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'doctor_updated', target: id, metadata: body })
  return ok(updated)
}

export const GET = handle(getDoctor)
export const PATCH = handle(patch)
export const POST = handle(setStatus) // POST /[id]/status would be cleaner but this routes /api/doctors/[id]/status
