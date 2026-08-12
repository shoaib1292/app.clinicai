import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function clockIn(req: NextRequest) {
  const { clinicId, session } = await requireClinicScope()
  const body = await req.json() as { staffId?: string; staffType?: string }

  const staffId = body.staffId || session.sub
  const staffType = body.staffType || session.type

  if (!['doctor', 'receptionist'].includes(staffType)) {
    return err('staffType must be doctor or receptionist', 400)
  }

  // Verify staff belongs to clinic
  if (staffType === 'doctor') {
    const doc = await db.doctor.findFirst({ where: { id: staffId, clinicId } })
    if (!doc) return err('Doctor not found', 404)
  } else {
    const rec = await db.receptionist.findFirst({ where: { id: staffId, clinicId } })
    if (!rec) return err('Receptionist not found', 404)
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Find or create today's record
  let record = await db.staffAttendance.findUnique({
    where: { clinicId_staffId_staffType_date: { clinicId, staffId, staffType, date: today } },
  })

  if (record?.clockIn) return err('Already clocked in today', 409)

  if (!record) {
    record = await db.staffAttendance.create({
      data: { clinicId, staffId, staffType, date: today, clockIn: new Date(), status: 'present' },
    })
  } else {
    record = await db.staffAttendance.update({
      where: { id: record.id },
      data: { clockIn: new Date(), status: 'present' },
    })
  }

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'clock_in', target: record.id })
  return ok(record)
}

async function clockOut(req: NextRequest) {
  const { clinicId, session } = await requireClinicScope()
  const body = await req.json() as { staffId?: string; staffType?: string }

  const staffId = body.staffId || session.sub
  const staffType = body.staffType || session.type

  if (!['doctor', 'receptionist'].includes(staffType)) {
    return err('staffType must be doctor or receptionist', 400)
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const record = await db.staffAttendance.findUnique({
    where: { clinicId_staffId_staffType_date: { clinicId, staffId, staffType, date: today } },
  })

  if (!record?.clockIn) return err('Not clocked in today', 400)
  if (record.clockOut) return err('Already clocked out today', 409)

  const updated = await db.staffAttendance.update({
    where: { id: record.id },
    data: { clockOut: new Date() },
  })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'clock_out', target: record.id })
  return ok(updated)
}

export const POST = handle(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  if (body.action === 'out') return clockOut(req)
  return clockIn(req)
})
