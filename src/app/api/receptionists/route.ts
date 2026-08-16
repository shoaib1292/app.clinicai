import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { hashPassword, randomToken } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'
import { sendStaffInvite, getClinicNameForUser } from '@/lib/staff-invite'

// GET /api/receptionists  — clinic-scoped list (clinic_admin only)
async function list(_req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  if (session.type !== 'clinic_admin') return err('Forbidden', 403)

  const receptionists = await db.receptionist.findMany({
    where: { clinicId },
    orderBy: { createdAt: 'desc' },
  })
  return ok(receptionists)
}

// POST /api/receptionists — create new receptionist
async function create(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  if (session.type !== 'clinic_admin') return err('Forbidden', 403)

  const body = await req.json().catch(() => ({}))
  const { name, email, password: rawPassword, phone } = body as {
    name?: string; email?: string; password?: string; phone?: string
  }
  const password = rawPassword || randomToken(12)
  if (!name || !email) return err('name, email required', 400)

  const emailLower = email.toLowerCase().trim()
  const existing = await db.receptionist.findUnique({ where: { email: emailLower } })
  if (existing) return err('Email already in use', 409)

  const passwordHash = await hashPassword(password)
  const receptionist = await db.receptionist.create({
    data: {
      clinicId,
      name,
      email: emailLower,
      passwordHash,
      phone: phone || null,
      active: true,
      emailVerified: null,
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'receptionist_created',
    target: receptionist.id,
    metadata: { name, email: emailLower },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  // Always send a verification/password-setup link — staff must verify email
  // before they can log in.
  const clinicName = await getClinicNameForUser('receptionist', clinicId)
  await sendStaffInvite({ id: receptionist.id, name: receptionist.name, email: receptionist.email, userType: 'receptionist' }, clinicName)

  return ok({ id: receptionist.id, name: receptionist.name, email: receptionist.email, phone: receptionist.phone, active: receptionist.active })
}

export const GET = handle(list)
export const POST = handle(create)
