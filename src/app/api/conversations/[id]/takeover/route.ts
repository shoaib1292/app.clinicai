import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

// Receptionist takes over the conversation (pauses agent for this patient)
async function takeover(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const convo = await db.conversation.findFirst({ where: { id, clinicId } })
  if (!convo) return err('Not found', 404)

  await db.conversation.update({ where: { id }, data: { takenOverBy: session.sub, status: 'active' } })
  // Signal the agent to pause for this conversation
  await store.set(`agent:paused:${clinicId}:${convo.patientId}`, true, 60 * 60) // 1h

  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'conversation_takeover', target: id })
  return ok({ taken: true })
}

export const POST = handle(takeover)
