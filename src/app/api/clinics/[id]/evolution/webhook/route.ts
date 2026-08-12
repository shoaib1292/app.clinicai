import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { updateEvolutionWebhook } from '@/lib/evolution'

async function update(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireType('platform_admin')
  const { id } = await params
  const body = await req.json()
  const { webhookUrl } = body

  if (!webhookUrl) return err('Missing webhookUrl', 400)

  const clinic = await db.clinic.findUnique({
    where: { id },
    select: { evolutionInstance: true, evolutionConnected: true },
  })

  if (!clinic) return err('Clinic not found', 404)
  if (!clinic.evolutionInstance) return err('No Evolution instance configured for this clinic', 400)

  const result = await updateEvolutionWebhook(clinic.evolutionInstance, webhookUrl)

  if (!result.ok) return err(result.error || 'Failed to update webhook', 500)

  await auditLog({
    actorId: session.sub,
    actorType: 'platform_admin',
    action: 'webhook_updated',
    target: `clinic:${id}:evolution`,
    metadata: { instanceName: clinic.evolutionInstance, webhookUrl },
  })

  return ok({ updated: true, instanceName: clinic.evolutionInstance, webhookUrl })
}

export const PUT = handle(update)
