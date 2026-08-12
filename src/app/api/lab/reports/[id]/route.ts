import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, notFound, handle } from '@/lib/api'

async function getReport(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params

  const report = await db.labReport.findFirst({
    where: { id, clinicId },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      order: { include: { items: { include: { test: true } } } },
    },
  })
  if (!report) return notFound()
  return ok(report)
}

async function updateReport(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, session } = await requireClinicScope()
  const { id } = await params
  const body = await req.json() as { summary?: string; attachment?: string; status?: string }

  const report = await db.labReport.findFirst({ where: { id, clinicId } })
  if (!report) return notFound()

  const updated = await db.labReport.update({ where: { id }, data: body })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'lab_report_updated', target: id })
  return ok(updated)
}

export const GET = handle(getReport)
export const PATCH = handle(updateReport)
