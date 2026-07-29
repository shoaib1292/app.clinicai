import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  const active = url.searchParams.get('active')
  const type = url.searchParams.get('type')

  const where: Record<string, unknown> = { clinicId }
  if (doctorId) {
    where.OR = [{ coveredDoctorId: doctorId }, { coveringDoctorId: doctorId }]
  }
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false
  if (type) where.type = type

  const covers = await db.doctorCover.findMany({
    where,
    orderBy: { startDate: 'desc' },
    include: {
      coveredDoctor: { select: { id: true, name: true, speciality: true, active: true } },
      coveringDoctor: { select: { id: true, name: true, speciality: true, active: true } },
    },
  })
  return ok(covers)
}

async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json()
  const { coveredDoctorId, coveringDoctorId, startDate, endDate, type, transferAppointments, reason } = body

  if (!coveredDoctorId || !coveringDoctorId || !startDate || !type) {
    return err('coveredDoctorId, coveringDoctorId, startDate, and type are required', 400)
  }
  if (!['temporary', 'permanent'].includes(type)) {
    return err('type must be temporary or permanent', 400)
  }
  if (coveredDoctorId === coveringDoctorId) {
    return err('A doctor cannot cover themselves', 400)
  }

  const [coveredDoctor, coveringDoctor] = await Promise.all([
    db.doctor.findFirst({ where: { id: coveredDoctorId, clinicId } }),
    db.doctor.findFirst({ where: { id: coveringDoctorId, clinicId } }),
  ])
  if (!coveredDoctor) return err('Covered doctor not found', 404)
  if (!coveringDoctor) return err('Covering doctor not found', 404)

  if (endDate && new Date(endDate) <= new Date(startDate)) {
    return err('endDate must be after startDate', 400)
  }

  // Check for overlapping active covers for the same covered doctor
  const overlapping = await db.doctorCover.findFirst({
    where: {
      coveredDoctorId,
      active: true,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date(startDate) } },
      ],
    },
  })
  if (overlapping) {
    return err('An active cover already exists for this doctor', 409)
  }

  const cover = await db.doctorCover.create({
    data: {
      clinicId,
      coveredDoctorId,
      coveringDoctorId,
      type,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      transferAppointments: transferAppointments === true,
      reason: reason || null,
      active: true,
    },
  })

  // If temporary cover, set covered doctor status to off
  if (type === 'temporary') {
    await db.doctor.update({ where: { id: coveredDoctorId }, data: { currentStatus: 'off' } })
  }

  // If permanent and transfer appointments is requested, reassign future appointments
  if (type === 'permanent' && transferAppointments) {
    const futureAppts = await db.appointment.findMany({
      where: {
        doctorId: coveredDoctorId,
        clinicId,
        status: { in: ['booked', 'confirmed'] },
        start: { gte: new Date(startDate) },
      },
      include: { slot: true },
    })

    for (const appt of futureAppts) {
      await db.$transaction(async (tx) => {
        // Release old slot
        if (appt.slotId) {
          await tx.slot.update({ where: { id: appt.slotId }, data: { status: 'open' } })
        }

        // Find/create equivalent slot on covering doctor
        const slotDate = new Date(appt.start)
        const dateOnly = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate()))
        const startStr = appt.slot?.startTime || ''
        const endStr = appt.slot?.endTime || ''

        let newSlot = await tx.slot.findFirst({
          where: {
            doctorId: coveringDoctorId,
            date: dateOnly,
            startTime: startStr,
            status: 'open',
          },
        })

        if (!newSlot) {
          newSlot = await tx.slot.create({
            data: {
              doctorId: coveringDoctorId,
              clinicId,
              date: dateOnly,
              startTime: startStr,
              endTime: endStr,
              durationMin: coveringDoctor.slotDurationMin,
              status: 'open',
            },
          })
        }

        // Update slot to booked
        await tx.slot.update({ where: { id: newSlot.id }, data: { status: 'booked' } })

        // Reassign appointment
        await tx.appointment.update({
          where: { id: appt.id },
          data: { doctorId: coveringDoctorId, slotId: newSlot.id },
        })
      })
    }
  }

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'doctor_cover_created',
    target: cover.id,
    metadata: { coveredDoctorId, coveringDoctorId, type, startDate, endDate, transferAppointments },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(cover)
}

export const GET = handle(list)
export const POST = handle(create)
