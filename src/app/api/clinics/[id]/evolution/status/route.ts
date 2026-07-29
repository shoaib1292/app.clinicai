import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { safeJson, friendlyEvoError } from '@/lib/evolution'

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

  if (clinic?.evolutionConnected) {
    return ok({
      status: 'connected',
      instanceName: conn?.evoInstanceName || clinic?.evolutionInstance || null,
      dbStatus: conn?.status || 'connected',
      evolutionConnected: true,
    })
  }

  const instanceName = conn?.evoInstanceName || clinic?.evolutionInstance
  if (instanceName && process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const evoRes = await fetch(
        `${process.env.EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
        { headers: { apikey: process.env.EVOLUTION_API_KEY }, signal: controller.signal },
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
        })
      }

      const evoState = evoData.instance?.state || evoData.state || ''
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
        })
      }

      return ok({
        status: conn?.status || 'connecting',
        instanceName,
        dbStatus: conn?.status || null,
        evolutionConnected: false,
        evoState,
      })
    } catch (err) {
      console.warn(`[evo:status] Failed to check Evolution for ${instanceName}:`, err)
      return ok({
        status: 'error',
        instanceName,
        error: friendlyEvoError(err),
        evolutionConnected: false,
      })
    }
  }

  return ok({
    status: conn?.status || 'disconnected',
    instanceName: conn?.evoInstanceName || clinic?.evolutionInstance || null,
    dbStatus: conn?.status || null,
    evolutionConnected: clinic?.evolutionConnected || false,
  })
}

export const GET = handle(status)
