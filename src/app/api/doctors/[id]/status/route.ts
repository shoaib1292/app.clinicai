import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

async function setStatus(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json()
  const { status, etaMin } = body
  if (!['in_clinic', 'break', 'off', 'on_way'].includes(status)) return err('Invalid status', 400)

  const doctor = await db.doctor.findFirst({ where: { id, clinicId } })
  if (!doctor) return err('Doctor not found', 404)

  await db.doctor.update({ where: { id }, data: { currentStatus: status, statusEta: etaMin ?? null } })
  await store.publish(`clinic:${clinicId}:ops`, { type: 'doctor_status_changed', doctorId: id, status, etaMin })
  await store.publish(`doctor:${id}`, { type: 'status_changed', status })

  return ok({ status, updatedBy: session.sub })
}

export const POST = handle(setStatus)
