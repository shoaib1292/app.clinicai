import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { safeJson, friendlyEvoError, resolveEvoCredentials } from '@/lib/evolution'

const WEBHOOK_URL = `${process.env.WHATSAPP_WEBHOOK_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://app.clinicai.pk'}/api/webhooks/evolution`

async function status(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('clinic_admin')
  if (session.clinicId !== id) return err('Unauthorized', 403)

  const clinic = await db.clinic.findUnique({
    where: { id },
    select: { evolutionConnected: true, evolutionInstance: true },
  })

  const conn = await db.whatsAppConnection.findFirst({
    where: { clinicId: id, mode: 'evo' },
    select: { status: true, evoInstanceName: true },
    orderBy: { createdAt: 'desc' },
  })

  const instanceName = conn?.evoInstanceName || clinic?.evolutionInstance
  const { baseUrl, apiKey } = await resolveEvoCredentials()

  // Check Evolution-instance-side webhook config
  let webhookOk = false
  let webhookUrl = ''
  if (instanceName && baseUrl && apiKey) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const whRes = await fetch(`${baseUrl}/webhook/find/${instanceName}`, {
        headers: { apikey: apiKey },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const whData = await safeJson(whRes)
      webhookOk = Array.isArray(whData)
        ? (whData as Array<{ url?: string; enabled?: boolean }>).some((w) => w.enabled && w.url?.includes('/webhooks/evolution'))
        : false
      webhookUrl = Array.isArray(whData)
        ? (whData as Array<{ url?: string }>).find((w) => (w as { url?: string }).url)?.url || ''
        : ''
      if (!webhookOk && instanceName) {
        // Auto-fix: set webhook URL
        await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: apiKey },
          body: JSON.stringify({
            enabled: true,
            url: WEBHOOK_URL,
            events: ['messages.upsert', 'connection.update', 'qrcode.updated'],
          }),
        })
        console.log(`[evo:status] Auto-fixed webhook for ${instanceName} → ${WEBHOOK_URL}`)
        webhookOk = true
        webhookUrl = WEBHOOK_URL
      }
    } catch {
      // Can't reach Evolution
    }
  }

  if (clinic?.evolutionConnected) {
    return ok({
      status: 'connected',
      instanceName,
      dbStatus: conn?.status || 'connected',
      evolutionConnected: true,
      webhookOk,
      webhookUrl,
    })
  }

  if (instanceName && baseUrl && apiKey) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const evoRes = await fetch(
        `${baseUrl}/instance/connectionState/${instanceName}`,
        { headers: { apikey: apiKey }, signal: controller.signal },
      )
      clearTimeout(timeout)

      const evoData = await safeJson(evoRes)
      if (evoData.error) {
        console.warn(`[evo:status] Error for ${instanceName}: ${evoData.error}`)
        return ok({
          status: 'error',
          instanceName,
          error: friendlyEvoError(evoData.error),
          evolutionConnected: false,
          webhookOk,
          webhookUrl,
        })
      }

      const instance = evoData.instance as { state?: string } | undefined
      const evoState = instance?.state || (evoData.state as string) || ''
      if (evoState === 'open' || evoState === 'connected') {
        await db.$transaction([
          db.whatsAppConnection.updateMany({
            where: { evoInstanceName: instanceName },
            data: { status: 'connected' },
          }),
          db.clinic.updateMany({
            where: { evolutionInstance: instanceName },
            data: { evolutionConnected: true },
          }),
        ])
        return ok({
          status: 'connected',
          instanceName,
          dbStatus: 'connected',
          evolutionConnected: true,
          synced: true,
          webhookOk,
          webhookUrl,
        })
      }

      return ok({
        status: conn?.status || 'connecting',
        instanceName,
        dbStatus: conn?.status || null,
        evolutionConnected: false,
        evoState,
        webhookOk,
        webhookUrl,
      })
    } catch (err) {
      console.warn(`[evo:status] Failed to check Evolution for ${instanceName}:`, err)
      return ok({
        status: 'error',
        instanceName,
        error: friendlyEvoError(err),
        evolutionConnected: false,
        webhookOk,
        webhookUrl,
      })
    }
  }

  return ok({
    status: conn?.status || 'disconnected',
    instanceName,
    dbStatus: conn?.status || null,
    evolutionConnected: clinic?.evolutionConnected || false,
    webhookOk,
    webhookUrl,
  })
}

export const GET = handle(status)
