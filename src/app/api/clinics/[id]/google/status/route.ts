import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'
import { checkConnectionHealth, isTokenExpiringSoon } from '@/lib/providers/google-health'

export const GET = handle(async (_req: NextRequest, _ctx: { params: Promise<{ id: string }> }) => {
  const { clinicId } = await requireClinicScope()

  const connection = await db.googleConnection.findFirst({
    where: { clinicId },
    select: { id: true },
  })

  if (!connection) {
    return ok({ connected: false, featuresAvailable: true })
  }

  const health = await checkConnectionHealth(connection.id, clinicId)
  if (!health) {
    return ok({ connected: false, featuresAvailable: true })
  }

  return ok({
    connected: true,
    email: health.googleEmail,
    status: health.status,
    features: health.features,
    scopes: health.scopes,
    health: {
      tokenValid: health.tokenValid,
      tokenExpiringSoon: isTokenExpiringSoon(health.tokenExpiresAt),
      tokenExpiresAt: health.tokenExpiresAt,
    },
    lastSync: health.lastSyncAt,
    lastError: health.lastError,
    lastErrorAt: health.lastErrorAt,
    daysSinceConnected: health.daysSinceConnected,
  })
})
