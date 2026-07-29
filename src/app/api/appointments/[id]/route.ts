import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { computeRefund } from '@/lib/schedule'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

async function getAppt(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params
  const appt = await db.appointment.findFirst({
    where: { id, clinicId },
    include: { patient: true, doctor: true, service: true, fees: true, reminders: true, paymentProof: true },
  })
  if (!appt) return err('Not found', 404)
  return ok(appt)
}

async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = await req.json()
  const appt = await db.appointment.findFirst({ where: { id, clinicId } })
  if (!appt) return err('Not found', 404)
  const updated = await db.appointment.update({ where: { id }, data: {
    status: body.status, paymentStatus: body.paymentStatus, paymentMode: body.paymentMode,
    notes: body.notes, checkInTime: body.checkInTime ? new Date(body.checkInTime) : undefined,
  } })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'appointment_updated', target: id, metadata: body })
  return ok(updated)
}

export const GET = handle(getAppt)
export const PATCH = handle(patch)
