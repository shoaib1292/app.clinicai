import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/pharmacy/prescriptions
async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const patientId = url.searchParams.get('patientId')
  const rxs = await db.prescription.findMany({
    where: { clinicId, deletedAt: null, ...(patientId ? { patientId } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true, speciality: true } },
      items: { include: { product: { select: { id: true, name: true, form: true, unit: true, salePrice: true } } } },
    },
  })
  return ok(rxs)
}

// POST /api/pharmacy/prescriptions
// Body: { patientId, doctorId?, appointmentId?, notes?, items: [{productId, quantity, dosage?}] }
async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const b = await req.json().catch(() => ({}))
  if (!b.patientId || !Array.isArray(b.items) || b.items.length === 0) {
    return err('patientId and items required', 400)
  }
  const patient = await db.patient.findFirst({ where: { id: b.patientId, clinicId } })
  if (!patient) return err('Patient not found', 404)

  const productIds = b.items.map((i: any) => i.productId)
  const products = await db.pharmacyProduct.findMany({ where: { id: { in: productIds }, clinicId } })
  if (products.length !== new Set(productIds).size) return err('Invalid product in items', 400)

  const rx = await db.prescription.create({
    data: {
      clinicId,
      patientId: b.patientId,
      doctorId: b.doctorId || null,
      appointmentId: b.appointmentId || null,
      notes: b.notes || null,
      items: {
        create: b.items.map((i: any) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          dosage: i.dosage || null,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'pharmacy_prescription_created', target: rx.id, metadata: b })
  return ok(rx)
}

export const GET = handle(list)
export const POST = handle(create)
