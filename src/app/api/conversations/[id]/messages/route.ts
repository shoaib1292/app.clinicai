import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

// GET /api/conversations/[id]/messages — fetch all messages for a conversation
async function listMessages(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params

  const convo = await db.conversation.findFirst({ where: { id, clinicId } })
  if (!convo) return err('Conversation not found', 404)

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { ts: 'desc' },
    take: 200,
  })

  return ok(messages)
}

// POST /api/conversations/[id]/messages — send a message
async function sendMessage(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = await req.json()
  const text = body.text || body.body
  if (!text) return err('text or body required', 400)

  const convo = await db.conversation.findFirst({ where: { id, clinicId } })
  if (!convo) return err('Conversation not found', 404)

  const msg = await db.message.create({
    data: {
      conversationId: id,
      direction: 'out',
      type: 'text',
      body: text,
    },
  })

  await store.publish(`clinic:${clinicId}:conversations`, {
    type: 'message_received',
    conversationId: id,
    direction: 'out',
    body: text,
  })

  await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } })

  return ok(msg)
}

export const GET = handle(listMessages)
export const POST = handle(sendMessage)
