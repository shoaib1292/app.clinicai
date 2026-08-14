import { cookies } from 'next/headers'
import { db } from './db'
import { SESSION_COOKIE, verifySession, type SessionPayload } from './auth'

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  return session
}

// Resolve the clinic context for the current user (clinic_admin/doctor/receptionist)
export async function getCurrentClinicId(): Promise<string | null> {
  const session = await getSession()
  return session?.clinicId ?? null
}

// Require auth; throw if not authenticated
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

// Require a specific user type
export async function requireType(...types: string[]): Promise<SessionPayload> {
  const session = await requireAuth()
  if (!types.includes(session.type)) throw new Error('FORBIDDEN')
  return session
}

// Require platform-level scope (analytics/email-analytics authorization gate)
export async function requireScope(_scope: string): Promise<SessionPayload> {
  return requireType('platform_admin', 'platform_staff')
}

// Require clinic-scoped access; returns clinicId
export async function requireClinicScope(): Promise<{ session: SessionPayload; clinicId: string }> {
  const session = await requireAuth()
  if (!session.clinicId) throw new Error('NO_CLINIC')
  return { session, clinicId: session.clinicId }
}

export async function auditLog(params: {
  actorId?: string
  actorType?: string
  clinicId?: string
  action: string
  target?: string
  metadata?: Record<string, unknown>
  ip?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        actorType: params.actorType || 'system',
        clinicId: params.clinicId,
        action: params.action,
        target: params.target,
        metadata: JSON.stringify(params.metadata ?? {}),
        ip: params.ip ?? null,
      },
    })
  } catch (e) {
    console.error('auditLog failed', e)
  }
}
