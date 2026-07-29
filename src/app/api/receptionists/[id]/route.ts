import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { hashPassword } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'

// GET /api/receptionists/[id] — get a single receptionist
async function getReceptionist(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params

  const receptionist = await db.receptionist.findFirst({ where: { id, clinicId } })
  if (!receptionist) return err('Receptionist not found', 404)

  const { passwordHash, ...safe } = receptionist
  return ok(safe)
}

// PATCH /api/receptionists/[id] — update a receptionist
async function updateReceptionist(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  if (session.type !== 'clinic_admin') return err('Forbidden', 403)
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const { name, email, phone, password, active } = body as Record<string, unknown>

  const existing = await db.receptionist.findFirst({ where: { id, clinicId } })
  if (!existing) return err('Receptionist not found', 404)

  const data: Record<string, unknown> = {}
  if (typeof name === 'string' && name.trim()) data.name = name.trim()
  if (typeof email === 'string' && email.trim()) {
    const lower = email.trim().toLowerCase()
    if (lower !== existing.email) {
      const dup = await db.receptionist.findUnique({ where: { email: lower } })
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

  const updated = await db.receptionist.update({ where: { id }, data })
  const { passwordHash: _, ...safe } = updated

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'receptionist_updated',
    target: id,
    metadata: data,
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(safe)
}

// DELETE /api/receptionists/[id] — soft-delete a receptionist
async function deleteReceptionist(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  if (session.type !== 'clinic_admin') return err('Forbidden', 403)
  const { id } = await params

  const existing = await db.receptionist.findFirst({ where: { id, clinicId } })
  if (!existing) return err('Receptionist not found', 404)

  await db.receptionist.update({ where: { id }, data: { deletedAt: new Date(), active: false } })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'receptionist_deleted',
    target: id,
    metadata: { name: existing.name },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ deleted: true })
}

export const GET = handle(getReceptionist)
export const PATCH = handle(updateReceptionist)
export const DELETE = handle(deleteReceptionist)
