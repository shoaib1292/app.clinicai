import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function listShifts(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const shifts = await db.staffShift.findMany({ where: { clinicId }, orderBy: { startTime: 'asc' } })
  return ok(shifts)
}

async function createShift(req: NextRequest) {
  const { clinicId, session } = await requireClinicScope()
  const body = await req.json() as { label: string; startTime: string; endTime: string }

  if (!body.label || !body.startTime || !body.endTime) return err('label, startTime, endTime are required', 400)

  const shift = await db.staffShift.create({
    data: { clinicId, label: body.label.trim(), startTime: body.startTime, endTime: body.endTime },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'shift_created', target: shift.id })
  return ok(shift)
}

export const GET = handle(listShifts)
export const POST = handle(createShift)
