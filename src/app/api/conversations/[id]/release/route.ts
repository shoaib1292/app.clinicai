import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

async function release(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const convo = await db.conversation.findFirst({ where: { id, clinicId } })
  if (!convo) return err('Not found', 404)

  await db.conversation.update({ where: { id }, data: { takenOverBy: null } })
  await store.del(`agent:paused:${clinicId}:${convo.patientId}`)

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'conversation_released', target: id })
  return ok({ released: true })
}

export const POST = handle(release)
