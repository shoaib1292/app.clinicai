import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { hashPassword, randomToken } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'
import { sendStaffInvite, getClinicNameForUser } from '@/lib/staff-invite'

async function list(_req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  if (session.type !== 'clinic_admin') return err('Forbidden', 403)

  const list = await db.labAdmin.findMany({
    where: { clinicId },
    orderBy: { createdAt: 'desc' },
  })
  return ok(list)
}

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
  const existing = await db.labAdmin.findUnique({ where: { email: emailLower } })
  if (existing) return err('Email already in use', 409)

  const passwordHash = await hashPassword(password)
  const lab = await db.labAdmin.create({
    data: {
      clinicId, name, email: emailLower, passwordHash,
      phone: phone || null, active: true,
    },
  })

  await auditLog({
    actorId: session.sub, actorType: session.type, clinicId,
    action: 'lab_admin_created', target: lab.id,
    metadata: { name, email: emailLower },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  // Send invitation email with password-setup link (7-day expiry)
  if (!rawPassword) {
    const clinicName = await getClinicNameForUser('lab_admin', clinicId)
    await sendStaffInvite({ id: lab.id, name: lab.name, email: lab.email, userType: 'lab_admin' }, clinicName)
  }

  return ok({ id: lab.id, name: lab.name, email: lab.email, phone: lab.phone, active: lab.active })
}

export const GET = handle(list)
export const POST = handle(create)
