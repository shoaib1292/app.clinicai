import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// Mark appointment as no-show + increment patient's no_show_count
async function markNoShow(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const appt = await db.appointment.findFirst({ where: { id, clinicId }, include: { patient: true } })
  if (!appt) return err('Not found', 404)

  await db.appointment.update({ where: { id }, data: { status: 'no_show' } })
  await db.patient.update({ where: { id: appt.patientId }, data: { noShowCount: { increment: 1 } } })

  // 3 no-shows in 90 days → flag for prepayment requirement
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const recentNoShows = await db.appointment.count({
    where: { patientId: appt.patientId, status: 'no_show', start: { gte: ninetyDaysAgo } },
  })
  const requiresPrepayment = recentNoShows >= 3

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'marked_no_show', target: id, metadata: { patientNoShowCount: appt.patient.noShowCount + 1, requiresPrepayment } })

  return ok({ status: 'no_show', patientNoShowCount: appt.patient.noShowCount + 1, requiresPrepayment })
}

export const POST = handle(markNoShow)
