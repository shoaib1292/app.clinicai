import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// Toggle agent on/off without rescanning QR
async function toggle(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { enabled, reason } = body as { enabled?: boolean; reason?: string }

  let session
  try {
    session = await requireType('platform_admin', 'platform_staff', 'clinic_admin')
  } catch {
    return err('Forbidden', 403)
  }

  if (session.type === 'clinic_admin' && session.clinicId !== id) {
    return err('Cannot toggle another clinic', 403)
  }

  const clinic = await db.clinic.findUnique({ where: { id } })
  if (!clinic) return err('Clinic not found', 404)

  const newEnabled = enabled ?? !clinic.agentEnabled

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
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ enabled: newEnabled })
}

export const POST = handle(toggle)
