import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { hashPassword } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'
import { sendStaffInvite, getClinicNameForUser } from '@/lib/staff-invite'

async function list(_req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const doctors = await db.doctor.findMany({
    where: { clinicId },
    orderBy: { name: 'asc' },
    include: {
      schedules: true,
      services: { select: { id: true, name: true } },
      _count: { select: { appointments: true, slots: true } },
    },
  })
  return ok(doctors)
}

async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json()
  const { name, gender, speciality, slotDurationMin, queueMode, email, password, workingHours, canTelemedicine, telemedicineFee } = body
  if (!name || !speciality) return err('Name and speciality required', 400)

  const passwordHash = email && password ? await hashPassword(password) : null

  const doctor = await db.doctor.create({
    data: {
      name,
      gender: gender || 'male',
      speciality,
      slotDurationMin: slotDurationMin || 15,
      queueMode: queueMode || 'hybrid',
      currentStatus: 'off',
      workingHours: JSON.stringify(workingHours || {
        mon: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        tue: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        wed: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        thu: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        fri: { start: '14:00', end: '20:00', breaks: [] },
        sat: { start: '09:00', end: '15:00', breaks: [] },
      }),
      clinicId,
      email: email || null,
      passwordHash,
      emailVerified: null,
      canTelemedicine: canTelemedicine ?? false,
      telemedicineFee: telemedicineFee ?? 0,
    },
  })

  // Auto-create schedules from workingHours
  const wh = JSON.parse(doctor.workingHours)
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  for (let dow = 0; dow < 7; dow++) {
    const dayKey = days[dow]
    const day = wh[dayKey]
    if (day) {
      await db.schedule.create({
        data: {
          doctorId: doctor.id,
          dayOfWeek: dow,
          startTime: day.start,
          endTime: day.end,
          breakWindows: JSON.stringify(day.breaks || []),
        },
      })
    }
  }

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'doctor_created', target: doctor.id, metadata: { name, speciality } })

  // Send a verification/password-setup link when a login email was provided —
  // doctor must verify email before they can log in.
  if (email) {
    const clinicName = await getClinicNameForUser('doctor', clinicId)
    await sendStaffInvite({ id: doctor.id, name: doctor.name, email: doctor.email || '', userType: 'doctor' }, clinicName)
  }

  return ok(doctor)
}

export const GET = handle(list)
export const POST = handle(create)
