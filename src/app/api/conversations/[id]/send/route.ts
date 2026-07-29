import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

// Staff manually sends a message in a conversation
async function send(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = await req.json()
  const { body: msgBody } = body
  if (!msgBody) return err('body required', 400)

  const convo = await db.conversation.findFirst({ where: { id, clinicId } })
  if (!convo) return err('Not found', 404)

  const msg = await db.message.create({
    data: {
      conversationId: id,
      direction: 'out',
      type: 'text',
      body: msgBody,
    },
  })
  store.publish(`clinic:${clinicId}:conversations`, { type: 'message_received', conversationId: id, direction: 'out', body: msgBody })

  await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } })
  return ok(msg)
}

export const POST = handle(send)
