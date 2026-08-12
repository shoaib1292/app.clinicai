import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, notFound, handle } from '@/lib/api'
import { revokeConnection } from '@/lib/google-token-manager'

export const POST = handle(async (_req: NextRequest, _ctx: { params: Promise<{ id: string }> }) => {
  const { clinicId } = await requireClinicScope()

  const connection = await db.googleConnection.findFirst({
    where: { clinicId, status: { not: 'revoked' } },
    select: { id: true, calendarResourceId: true },
  })

  if (!connection) return notFound('No active Google connection found')

  // Stop calendar watch channel if active
  if (connection.calendarResourceId) {
    try {
      const { getOAuth2Client } = await import('@/lib/google-token-manager')
      const { google } = await import('googleapis')
      const auth = await getOAuth2Client(connection.id)
      if (auth) {
        const cal = google.calendar({ version: 'v3', auth })
        await cal.channels.stop({
          requestBody: {
            id: `clinicai-${connection.id}`,
            resourceId: connection.calendarResourceId,
          },
        }).catch(() => {})
      }
    } catch {
      // Channel may already be expired — proceed
    }
  }

  // Revoke OAuth tokens
  await revokeConnection(connection.id, clinicId)

  // Clear calendar sync state
  await db.googleConnection.update({
    where: { id: connection.id },
    data: {
      calendarSyncToken: null,
      calendarResourceId: null,
      calendarChannelExpiry: null,
      lastCalendarSyncAt: null,
    },
  })

  // Delete calendar events for this connection
  await db.googleCalendarEvent.deleteMany({
    where: { connectionId: connection.id },
  })

  return ok({ disconnected: true })
})
