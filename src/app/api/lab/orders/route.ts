import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, notFound, handle } from '@/lib/api'

async function listOrders(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const patientId = url.searchParams.get('patientId')
  const doctorId = url.searchParams.get('doctorId')
  const status = url.searchParams.get('status')
  const limit = Number(url.searchParams.get('limit') || '50')

  const orders = await db.labOrder.findMany({
    where: {
      clinicId,
      ...(patientId ? { patientId } : {}),
      ...(doctorId ? { doctorId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true } },
      items: { include: { test: { select: { id: true, name: true, category: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return ok(orders)
}

async function createOrder(req: NextRequest) {
  const { clinicId, session } = await requireClinicScope()
  const body = await req.json() as { patientId: string; doctorId?: string; appointmentId?: string; testIds: string[]; notes?: string }

  if (!body.patientId || !body.testIds?.length) return err('patientId and testIds are required', 400)

  const patient = await db.patient.findUnique({ where: { id: body.patientId } })
  if (!patient || patient.clinicId !== clinicId) return err('Patient not found', 404)

  const tests = await db.labTest.findMany({
    where: { id: { in: body.testIds }, clinicId, isActive: true },
  })
  if (tests.length !== body.testIds.length) return err('Some tests not found or inactive', 400)

  const totalPrice = tests.reduce((sum, t) => sum + t.price, 0)

  const order = await db.labOrder.create({
    data: {
      clinicId,
      patientId: body.patientId,
      doctorId: body.doctorId || null,
      appointmentId: body.appointmentId || null,
      notes: body.notes || null,
      totalPrice,
      items: {
        create: tests.map(t => ({ testId: t.id, price: t.price })),
      },
    },
    include: { items: { include: { test: true } }, patient: { select: { name: true } } },
  })

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'lab_order_created', target: order.id })
  return ok(order)
}

export const GET = handle(listOrders)
export const POST = handle(createOrder)
