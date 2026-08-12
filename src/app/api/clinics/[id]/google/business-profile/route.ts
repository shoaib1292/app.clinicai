import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, notFound, handle } from '@/lib/api'
import { syncBusinessProfile } from '@/lib/providers/google-business'

export const GET = handle(async (_req: NextRequest, _ctx: { params: Promise<{ id: string }> }) => {
  const { clinicId } = await requireClinicScope()

  const connection = await db.googleConnection.findFirst({
    where: { clinicId, businessEnabled: true, status: 'active' },
  })

  if (!connection) {
    return ok({ connected: false })
  }

  // Try fresh sync
  const profile = await syncBusinessProfile(connection.id, clinicId)

  // Also check DB for last synced data
  const stored = await db.googleBusinessProfile.findUnique({
    where: { connectionId: connection.id },
  })

  return ok({
    connected: true,
    profile: profile || (stored ? {
      name: stored.name,
      placeId: stored.placeId,
      formattedAddress: stored.formattedAddress,
      phoneNumber: stored.phoneNumber,
      websiteUrl: stored.websiteUrl,
      rating: stored.rating,
      reviewCount: stored.reviewCount,
      openingHours: stored.openingHours ? JSON.parse(stored.openingHours) : null,
      lastSynced: stored.syncedAt,
    } : null),
  })
})
