import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { disconnectEvolutionInstance } from '@/lib/evolution'
import { ok, err, handle } from '@/lib/api'

async function disconnect(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('clinic_admin', 'platform_admin')
  if (session.type === 'clinic_admin' && session.clinicId !== id) return err('Unauthorized', 403)

  const clinic = await db.clinic.findUnique({ where: { id } })
  if (!clinic) return err('Clinic not found', 404)

  const evoConn = await db.whatsAppConnection.findFirst({
    where: { clinicId: id, mode: 'evo', status: { not: 'disconnected' } },
  })

  if (evoConn?.evoInstanceName) {
    const result = await disconnectEvolutionInstance(evoConn.evoInstanceName)
    if (!result.ok) {
      console.warn(`[evo:disconnect] Failed to logout instance ${evoConn.evoInstanceName} from Evolution API — clearing from DB anyway`)
    }
  }

  await db.$transaction(async (tx) => {
    if (evoConn) {
      await tx.whatsAppConnection.update({
        where: { id: evoConn.id },
        data: { status: 'disconnected' },
      })
    }
    await tx.clinic.update({
      where: { id },
      data: { evolutionConnected: false, evolutionInstance: null, agentEnabled: false },
    })
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: id,
    action: 'evolution_disconnected',
    target: `clinic:${id}`,
    metadata: { instanceName: evoConn?.evoInstanceName },
  })

  return ok({ status: 'disconnected' })
}

export const POST = handle(disconnect)
