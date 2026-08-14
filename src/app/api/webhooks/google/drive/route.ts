import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { GoogleDriveProvider } from '@/lib/providers/documents/google'

export const POST = handle(async (req: NextRequest) => {
  const resourceId = req.headers.get('x-goog-resource-id')
  const channelId = req.headers.get('x-goog-channel-id')

  if (!resourceId) return err('Missing x-goog-resource-id', 400)

  // Drive webhooks don't have a per-connection resourceId mapping.
  // We parse the channel token to find the connection.
  const channelToken = req.headers.get('x-goog-channel-token')
  if (!channelToken) return ok({ received: true })

  let connectionId = ''
  try {
    const decoded = Buffer.from(channelToken, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    connectionId = parsed.connectionId || ''
  } catch {
    return ok({ received: true })
  }

  if (!connectionId) return ok({ received: true })

  const connection = await db.googleConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, clinicId: true },
  })

  if (!connection) return ok({ received: true })

  try {
    const provider = new GoogleDriveProvider(connection.id, connection.clinicId)

    // List recent changes — Google Drive push notifications don't include
    // the actual changed file IDs, so we do a lightweight metadata refresh
    const files = await provider.listFiles({ limit: 100 })

    // Sync metadata to local DB
    for (const file of files) {
      const existing = await db.googleDriveFile.findUnique({
        where: { id: file.providerFileId },
      })

      if (!existing) {
        await db.googleDriveFile.create({
          data: {
            id: file.providerFileId,
            connectionId: connection.id,
            clinicId: connection.clinicId,
            name: file.name,
            mimeType: file.mimeType,
            folderId: file.folderId || null,
            webViewLink: file.webViewLink || null,
            syncedAt: new Date(),
          },
        })
      } else {
        await db.googleDriveFile.update({
          where: { id: file.providerFileId },
          data: { name: file.name, webViewLink: file.webViewLink, syncedAt: new Date() },
        })
      }
    }

    await db.googleAuditLog.create({
      data: {
        clinicId: connection.clinicId,
        connectionId: connection.id,
        action: 'drive_sync',
        metadata: JSON.stringify({ filesSynced: files.length }),
      },
    })

    return ok({ synced: true, filesTracker: files.length })
  } catch (e) {
    console.error('[drive_webhook] Sync error:', e)
    return err('Sync failed', 500)
  }
})
