import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function del(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params

  const cover = await db.doctorCover.findFirst({ where: { id, clinicId } })
  if (!cover) return err('Cover not found', 404)

  await db.doctorCover.update({ where: { id }, data: { active: false, deletedAt: new Date() } })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'doctor_cover_ended',
    target: id,
    metadata: { coveredDoctorId: cover.coveredDoctorId, coveringDoctorId: cover.coveringDoctorId, type: cover.type },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ deleted: true })
}

export const DELETE = handle(del)
