import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog, requireClinicScope } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// PATCH /api/clinics/[id]
// Supports two modes:
//   1) Agent toggle: { enabled, reason }  -> backwards-compatible with clinic-dashboard.tsx
//   2) Clinic settings / agent persona update: any subset of the documented fields below.
async function patchClinic(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  let session
  try {
    session = await requireType('platform_admin', 'platform_staff', 'clinic_admin')
  } catch {
    return err('Forbidden', 403)
  }

  // Clinic admin can only edit their own clinic
  if (session.type === 'clinic_admin' && session.clinicId !== id) {
    return err('Cannot edit another clinic', 403)
  }

  const clinic = await db.clinic.findUnique({ where: { id } })
  if (!clinic) return err('Clinic not found', 404)

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

  // -------- Branch 1: agent toggle (legacy contract) --------
  if (typeof body.enabled === 'boolean' && Object.keys(body).length <= 3) {
    const newEnabled = body.enabled as boolean
    const reason = typeof body.reason === 'string' ? body.reason : undefined
    await db.clinic.update({ where: { id }, data: { agentEnabled: newEnabled } })
    await db.agentToggle.upsert({
      where: { clinicId: id },
      create: {
        clinicId: id,
        enabled: newEnabled,
        pausedReason: newEnabled ? null : (reason || 'Manual toggle'),
        pausedBy: newEnabled ? null : session.sub,
        resumedAt: newEnabled ? new Date() : null,
      },
      update: {
        enabled: newEnabled,
        pausedReason: newEnabled ? null : (reason || 'Manual toggle'),
        pausedBy: newEnabled ? null : session.sub,
        pausedUntil: null,
        resumedAt: newEnabled ? new Date() : undefined,
      },
    })
    await auditLog({
      actorId: session.sub,
      actorType: session.type,
      clinicId: id,
      action: 'agent_toggled',
      target: `clinic:${id}:agent`,
      metadata: { enabled: newEnabled, reason },
      ip,
    })
    return ok({ enabled: newEnabled })
  }

  // -------- Branch 2: settings / persona patch --------
  const allowed: Record<string, unknown> = {}
  const fieldAllowlist = [
    'name', 'city', 'phone', 'address', 'timezone', 'currency',
    'onlinePaymentsEnabled', 'agentEnabled',
    'agentName', 'agentGender', 'agentTone', 'agentLanguages',
    'agentWelcome', 'agentFallback',
    'settlementMode',
  ]
  for (const k of fieldAllowlist) {
    if (k in body) allowed[k] = body[k]
  }

  if (Object.keys(allowed).length === 0) {
    return err('No valid fields to update', 400)
  }

  const updated = await db.clinic.update({ where: { id }, data: allowed })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: id,
    action: 'clinic_updated',
    target: `clinic:${id}`,
    metadata: allowed,
    ip,
  })

  return ok(updated)
}

async function getClinic(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await requireType('platform_admin', 'platform_staff')
  } catch {
    try {
      const { clinicId } = await requireClinicScope()
      if (clinicId !== id) return err('Forbidden', 403)
    } catch {
      return err('Forbidden', 403)
    }
  }
  const clinic = await db.clinic.findUnique({
    where: { id },
    include: {
      admins: true,
      doctors: { include: { _count: { select: { appointments: true } } } },
      receptionists: true,
      bankAccounts: true,
      whatsappConnections: true,
      agentToggle: true,
      _count: { select: { appointments: true, patients: true, conversations: true, paymentProofs: true } },
    },
  })
  if (!clinic) return err('Not found', 404)
  return ok(clinic)
}

export const GET = handle(getClinic)
export const PATCH = handle(patchClinic)
