import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// POST /api/receptionists/invite — invite a receptionist (same as create but no password required upfront)
async function invite(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  if (session.type !== 'clinic_admin') return err('Forbidden', 403)

  const body = await req.json()
  const { name, email, phone } = body
  if (!name || !email) return err('name and email required', 400)

  const emailLower = email.toLowerCase().trim()
  const existing = await db.receptionist.findUnique({ where: { email: emailLower } })
  if (existing) return err('Email already in use', 409)

  // Create with a placeholder password — receptionist can reset later
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'
  const { hashPassword } = await import('@/lib/auth')
  const passwordHash = await hashPassword(tempPassword)

  const receptionist = await db.receptionist.create({
    data: {
      clinicId,
      name,
      email: emailLower,
      passwordHash,
      phone: phone || null,
      active: true,
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'receptionist_invited',
    target: receptionist.id,
    metadata: { name, email: emailLower },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ id: receptionist.id, name: receptionist.name, email: receptionist.email, phone: receptionist.phone, active: receptionist.active, tempPassword })
}

export const POST = handle(invite)
