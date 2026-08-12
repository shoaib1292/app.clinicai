import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, notFound, handle } from '@/lib/api'

async function getOrder(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params

  const order = await db.labOrder.findFirst({
    where: { id, clinicId },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true } },
      items: { include: { test: true } },
      reports: true,
    },
  })
  if (!order) return notFound()
  return ok(order)
}

async function updateOrder(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, session } = await requireClinicScope()
  const { id } = await params
  const body = await req.json() as { status?: string; notes?: string; itemUpdates?: Array<{ itemId: string; status: string; result?: string }> }

  const order = await db.labOrder.findFirst({ where: { id, clinicId } })
  if (!order) return notFound()

  if (body.itemUpdates) {
    for (const item of body.itemUpdates) {
      const updated = await db.labOrderItem.updateMany({
        where: { id: item.itemId, orderId: id },
        data: {
          status: item.status,
          result: item.result || undefined,
          completedAt: item.status === 'completed' ? new Date() : undefined,
        },
      })
    }
    // Check if all items completed
    const items = await db.labOrderItem.findMany({ where: { orderId: id } })
    const allDone = items.every(i => i.status === 'completed')
    if (allDone) {
      await db.labOrder.update({ where: { id }, data: { status: 'completed' } })
    }
  }

  if (body.status || body.notes) {
    await db.labOrder.update({ where: { id }, data: { ...(body.status ? { status: body.status } : {}), ...(body.notes !== undefined ? { notes: body.notes } : {}) } })
  }

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'lab_order_updated', target: id })
  return ok({ updated: true })
}

export const GET = handle(getOrder)
export const PATCH = handle(updateOrder)
