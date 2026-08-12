import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, notFound, handle } from '@/lib/api'

async function listReports(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const patientId = url.searchParams.get('patientId')
  const orderId = url.searchParams.get('orderId')
  const limit = Number(url.searchParams.get('limit') || '50')

  const reports = await db.labReport.findMany({
    where: { clinicId, ...(patientId ? { patientId } : {}), ...(orderId ? { orderId } : {}) },
    include: {
      patient: { select: { id: true, name: true } },
      order: { select: { id: true, orderDate: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return ok(reports)
}

async function createReport(req: NextRequest) {
  const { clinicId, session } = await requireClinicScope()
  const body = await req.json() as { orderId: string; summary?: string; attachment?: string }

  if (!body.orderId) return err('orderId is required', 400)

  const order = await db.labOrder.findFirst({
    where: { id: body.orderId, clinicId },
    include: { patient: { select: { id: true } } },
  })
  if (!order) return notFound('Order not found')
  if (order.status !== 'completed') return err('Order must be completed before generating report', 400)

  const report = await db.labReport.create({
    data: {
      clinicId,
      orderId: body.orderId,
      patientId: order.patientId,
      doctorId: order.doctorId,
      summary: body.summary || null,
      attachment: body.attachment || null,
      status: 'final',
    },
    include: { patient: { select: { name: true } }, order: true },
  })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'lab_report_created', target: report.id })
  return ok(report)
}

export const GET = handle(listReports)
export const POST = handle(createReport)
