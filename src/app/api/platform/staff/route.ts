import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { hashPassword } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'

async function list() {
  const session = await requireType('platform_admin', 'platform_staff')

  const [admins, staff] = await Promise.all([
    db.platformAdmin.findMany({
      select: { id: true, name: true, email: true, role: true, twoFactorEnabled: true, createdAt: true },
    }),
    db.platformStaff.findMany({
      orderBy: { role: 'asc' },
      select: { id: true, name: true, email: true, role: true, scopes: true, active: true, createdAt: true },
    }),
  ])

  return ok({
    admins: admins.map((a) => ({
      ...a,
      roleLabel: 'Super Admin',
    })),
    staff: staff.map((s) => ({
      ...s,
      scopes: JSON.parse(s.scopes || '[]') as string[],
    })),
  })
}

async function create(req: NextRequest) {
  const session = await requireType('platform_admin')
  const body = await req.json().catch(() => ({}))
  const { name, email, password, role, scopes } = body as {
    name?: string; email?: string; password?: string; role?: string; scopes?: string[]
  }

  if (!name || !email || !password || !role) return err('name, email, password, role required', 400)
  const validRoles = ['sales', 'onboarding', 'support', 'finance']
  if (!validRoles.includes(role)) return err(`Invalid role: ${role}. Valid: ${validRoles.join(', ')}`, 400)

  const existing = await db.platformStaff.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) return err('Email already in use', 409)

  const passwordHash = await hashPassword(password)
  const staff = await db.platformStaff.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      scopes: JSON.stringify(scopes || []),
      active: true,
    },
    select: { id: true, name: true, email: true, role: true, scopes: true, active: true, createdAt: true },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'platform_staff_created',
    target: staff.id,
    metadata: { name, email: staff.email, role },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ ...staff, scopes: JSON.parse(staff.scopes || '[]') })
}

async function update(req: NextRequest) {
  const session = await requireType('platform_admin')
  const body = await req.json().catch(() => ({}))
  const { id, name, email, role, scopes, active } = body as {
    id?: string; name?: string; email?: string; role?: string; scopes?: string[]; active?: boolean
  }

  if (!id) return err('id required', 400)

  const existing = await db.platformStaff.findUnique({ where: { id } })
  if (!existing) return err('Staff not found', 404)

  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (email) {
    if (email !== existing.email) {
      const dup = await db.platformStaff.findUnique({ where: { email: email.toLowerCase().trim() } })
      if (dup) return err('Email already in use', 409)
    }
    data.email = email.toLowerCase().trim()
  }
  if (role) {
    const validRoles = ['sales', 'onboarding', 'support', 'finance']
    if (!validRoles.includes(role)) return err(`Invalid role: ${role}`, 400)
    data.role = role
  }
  if (scopes !== undefined) data.scopes = JSON.stringify(scopes)
  if (active !== undefined) data.active = active

  const updated = await db.platformStaff.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, scopes: true, active: true, createdAt: true },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'platform_staff_updated',
    target: updated.id,
    metadata: { changes: Object.keys(data) },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ ...updated, scopes: JSON.parse(updated.scopes || '[]') })
}

async function remove(req: NextRequest) {
  const session = await requireType('platform_admin')
  const body = await req.json().catch(() => ({}))
  const { id } = body as { id?: string }

  if (!id) return err('id required', 400)

  const existing = await db.platformStaff.findUnique({ where: { id } })
  if (!existing) return err('Staff not found', 404)

  // Soft delete
  await db.platformStaff.update({ where: { id }, data: { deletedAt: new Date(), active: false } })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'platform_staff_deleted',
    target: id,
    metadata: { name: existing.name, email: existing.email },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ deleted: true })
}

export const GET = handle(list)
export const POST = handle(create)
export const PATCH = handle(update)
export const DELETE = handle(remove)

