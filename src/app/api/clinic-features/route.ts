import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/clinic-features  -> all feature rows for the caller's clinic.
// Merges the headline Clinic boolean columns (agent, online_payments,
// pharmacy, inventory) so client consumers see the master switches even when
// no ClinicFeature row exists yet. Boolean columns are the source of truth.
async function list() {
  const { clinicId } = await requireClinicScope()
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      agentEnabled: true,
      onlinePaymentsEnabled: true,
      pharmacyEnabled: true,
      inventoryEnabled: true,
    },
  })
  const featureRows = await db.clinicFeature.findMany({
    where: { clinicId, deletedAt: null },
    orderBy: { key: 'asc' },
  })

  // Only the master switches (agent, online_payments, pharmacy, inventory) are
  // backed by Clinic boolean columns. Sub-features (suppliers, prescriptions,
  // counter, reports) live purely in ClinicFeature rows and must respect their
  // own `enabled` value — a saved "off" must stay off.
  const booleans: Record<string, boolean> = {
    agent: clinic?.agentEnabled ?? false,
    online_payments: clinic?.onlinePaymentsEnabled ?? false,
    pharmacy: clinic?.pharmacyEnabled ?? false,
    inventory: clinic?.inventoryEnabled ?? false,
  }

  const merged = featureRows.map((f) => ({ ...f }))
  const byKey = new Map(merged.map((f) => [f.key, f]))
  for (const [key, enabled] of Object.entries(booleans)) {
    const existing = byKey.get(key)
    if (existing) {
      // Master switch boolean is authoritative for its own key.
      existing.enabled = enabled || existing.enabled
    } else {
      merged.push({ key, enabled } as (typeof merged)[number])
    }
  }

  return ok(merged)
}

// PATCH /api/clinic-features  -> set a feature's enabled flag + optional config
// Body: { key, enabled, config? }
async function patch(req: NextRequest) {
  const { session, clinicId } = await requireClinicScope()
  const body = await req.json().catch(() => ({}))
  const { key, enabled, config } = body as { key?: string; enabled?: boolean; config?: Record<string, unknown> }

  if (!key) return err('key required', 400)
  if (typeof enabled !== 'boolean') return err('enabled must be boolean', 400)

  // Keep the Clinic boolean columns in sync for the headline switches.
  if (key === 'pharmacy') {
    await db.clinic.update({ where: { id: clinicId }, data: { pharmacyEnabled: enabled } })
  }
  if (key === 'inventory') {
    await db.clinic.update({ where: { id: clinicId }, data: { inventoryEnabled: enabled } })
  }

  const existing = await db.clinicFeature.findUnique({ where: { clinicId_key: { clinicId, key } } })
  const data: { enabled: boolean; config?: string } = { enabled }
  if (config !== undefined) data.config = JSON.stringify(config)

  const feature = existing
    ? await db.clinicFeature.update({ where: { clinicId_key: { clinicId, key } }, data })
    : await db.clinicFeature.create({ data: { clinicId, key, ...data } })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId,
    action: 'feature_toggled',
    target: `clinic:${clinicId}:feature:${key}`,
    metadata: { key, enabled, config: config ?? undefined },
  })

  return ok(feature)
}

export const GET = handle(list)
export const PATCH = handle(patch)
