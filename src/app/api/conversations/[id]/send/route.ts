import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { store } from '@/lib/store'
import { sendEvolutionMessage } from '@/lib/evolution'
import { ok, err, handle } from '@/lib/api'

const REALTIME_PORT = process.env.REALTIME_PORT || '3003'

async function broadcastToRealtime(channel: string, message: unknown): Promise<void> {
  try {
    await fetch(`http://localhost:${REALTIME_PORT}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, message }),
    })
  } catch { /* silent */ }
}

// Staff manually sends a message in a conversation
async function send(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = await req.json()
  const { body: msgBody } = body
  if (!msgBody) return err('body required', 400)

  const convo = await db.conversation.findFirst({
    where: { id, clinicId },
    include: { patient: { select: { phone: true } } },
  })
  if (!convo) return err('Not found', 404)

  const msg = await db.message.create({
    data: {
      conversationId: id,
      direction: 'out',
      type: 'text',
      body: msgBody,
    },
  })
  const channel = `clinic:${clinicId}:conversations`
  const event = { type: 'message_received', conversationId: id, direction: 'out', body: msgBody }
  store.publish(channel, event)
  void broadcastToRealtime(channel, event)

  await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } })

  await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } })

  // Deliver to WhatsApp via Evolution API
  const evoConn = await db.whatsAppConnection.findFirst({
    where: { clinicId, mode: 'evo', status: 'connected' },
  })
  if (evoConn?.evoInstanceName && convo.patient?.phone) {
    const sendResult = await sendEvolutionMessage(evoConn.evoInstanceName, convo.patient.phone, msgBody)
    if (!sendResult.ok) {
      console.warn(`[convo:send] Evolution send failed for convo ${id}:`, sendResult.error)
    }
  }

  return ok(msg)
}

export const POST = handle(send)
