import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function reassign(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id: sourceDoctorId } = await params
  const body = await req.json()
  const { targetDoctorId, fromDate } = body

  if (!targetDoctorId) return err('targetDoctorId required', 400)

  const [sourceDoctor, targetDoctor] = await Promise.all([
    db.doctor.findFirst({ where: { id: sourceDoctorId, clinicId } }),
    db.doctor.findFirst({ where: { id: targetDoctorId, clinicId } }),
  ])
  if (!sourceDoctor) return err('Source doctor not found', 404)
  if (!targetDoctor) return err('Target doctor not found', 404)

  const effectiveFrom = fromDate ? new Date(fromDate) : new Date()
  const futureAppts = await db.appointment.findMany({
    where: {
      doctorId: sourceDoctorId,
      clinicId,
      status: { in: ['booked', 'confirmed'] },
      start: { gte: effectiveFrom },
    },
    include: { slot: true },
  })

  let reassigned = 0
  for (const appt of futureAppts) {
    await db.$transaction(async (tx) => {
      if (appt.slotId) {
        await tx.slot.update({ where: { id: appt.slotId }, data: { status: 'open' } })
      }

      const slotDate = new Date(appt.start)
      const dateOnly = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate()))
      const startStr = appt.slot?.startTime || ''
      const endStr = appt.slot?.endTime || ''

      let newSlot = await tx.slot.findFirst({
        where: { doctorId: targetDoctorId, date: dateOnly, startTime: startStr, status: 'open' },
      })

      if (!newSlot) {
        newSlot = await tx.slot.create({
          data: {
            doctorId: targetDoctorId,
            clinicId,
            date: dateOnly,
            startTime: startStr,
            endTime: endStr,
            durationMin: targetDoctor.slotDurationMin,
            status: 'open',
          },
        })
      }

      await tx.slot.update({ where: { id: newSlot.id }, data: { status: 'booked' } })
      await tx.appointment.update({
        where: { id: appt.id },
        data: { doctorId: targetDoctorId, slotId: newSlot.id },
      })
      reassigned++
    })
  }

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'appointments_reassigned',
    target: sourceDoctorId,
    metadata: { targetDoctorId, reassigned, fromDate: effectiveFrom.toISOString() },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ reassigned })
}

export const POST = handle(reassign)
