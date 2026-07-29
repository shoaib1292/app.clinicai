import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

async function getConvo(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params
  const convo = await db.conversation.findFirst({
    where: { id, clinicId },
    include: {
      patient: { include: { familyMembers: true } },
      messages: { orderBy: { ts: 'asc' } },
    },
  })
  if (!convo) return err('Not found', 404)
  return ok(convo)
}

async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, clinicId } = await requireClinicScope()
  const { id } = await params
  const body = await req.json()
  const { status, tags, takenOverBy } = body
  const convo = await db.conversation.findFirst({ where: { id, clinicId } })
  if (!convo) return err('Not found', 404)
  const updated = await db.conversation.update({
    where: { id },
    data: {
      status: status,
      tags: tags ? JSON.stringify(tags) : undefined,
      takenOverBy: takenOverBy !== undefined ? takenOverBy : undefined,
    },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'conversation_updated', target: id, metadata: body })
  return ok(updated)
}

export const GET = handle(getConvo)
export const PATCH = handle(patch)
