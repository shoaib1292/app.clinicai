import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { hashPassword } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'

// PATCH /api/pharmacists/[id] — update a pharmacist (name, email, phone, password, active)
async function updatePharmacist(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  if (session.type !== 'clinic_admin') return err('Forbidden', 403)
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const { name, email, phone, password, active } = body as Record<string, unknown>

  const existing = await db.pharmacist.findFirst({ where: { id, clinicId } })
  if (!existing) return err('Pharmacist not found', 404)

  const data: Record<string, unknown> = {}
  if (typeof name === 'string' && name.trim()) data.name = name.trim()
  if (typeof email === 'string' && email.trim()) {
    const lower = email.trim().toLowerCase()
    if (lower !== existing.email) {
      const dup = await db.pharmacist.findUnique({ where: { email: lower } })
      if (dup) return err('Email already in use', 409)
      data.email = lower
    }
  }
  if (phone === null || (typeof phone === 'string' && phone.trim() === '')) data.phone = null
  else if (typeof phone === 'string') data.phone = phone
  if (typeof active === 'boolean') data.active = active
  if (typeof password === 'string' && password.length >= 4) {
    data.passwordHash = await hashPassword(password)
  }

  if (Object.keys(data).length === 0) return err('No valid fields to update', 400)

  const updated = await db.pharmacist.update({ where: { id }, data })
  const { passwordHash: _, ...safe } = updated

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'pharmacist_updated',
    target: id,
    metadata: data,
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(safe)
}

// DELETE /api/pharmacists/[id] — soft-delete a pharmacist
async function deletePharmacist(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  if (session.type !== 'clinic_admin') return err('Forbidden', 403)
  const { id } = await params

  const existing = await db.pharmacist.findFirst({ where: { id, clinicId } })
  if (!existing) return err('Pharmacist not found', 404)

  await db.pharmacist.update({ where: { id }, data: { deletedAt: new Date(), active: false } })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'pharmacist_deleted',
    target: id,
    metadata: { name: existing.name },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ deleted: true })
}

export const PATCH = handle(updatePharmacist)
export const DELETE = handle(deletePharmacist)
