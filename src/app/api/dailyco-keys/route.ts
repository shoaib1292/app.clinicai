import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { encrypt } from '@/lib/auth'
import { requireScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function list() {
  await requireScope('llm_key:read')
  const keys = await db.dailyApiKey.findMany({
    where: { deletedAt: null },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { rooms: { select: { id: true } } },
  })
  return ok(keys.map((k) => ({
    id: k.id,
    alias: k.alias,
    keyMasked: '••••' + k.encryptedKey.slice(-4),
    priority: k.priority,
    enabled: k.enabled,
    minutesUsedToday: k.minutesUsedToday,
    dailyLimit: k.dailyLimit,
    lastError: k.lastError,
    lastUsedAt: k.lastUsedAt,
    roomCount: k.rooms.length,
    createdAt: k.createdAt,
  })))
}

async function create(req: NextRequest) {
  const session = await requireScope('llm_key:manage')
  const body = await req.json()
  const { alias, apiKey, priority, dailyLimit } = body
  if (!alias || !apiKey) return err('Alias and API key are required', 400)

  const key = await db.dailyApiKey.create({
    data: {
      alias,
      encryptedKey: encrypt(apiKey),
      priority: priority ?? 1,
      dailyLimit: dailyLimit ?? 300,
      enabled: true,
      addedById: session.sub,
    },
  })
  await auditLog({ actorId: session.sub, actorType: 'platform_admin', action: 'dailyco_key_added', target: key.id, metadata: { alias } })
  return ok({ id: key.id })
}

async function update(req: NextRequest) {
  const session = await requireScope('llm_key:manage')
  const body = await req.json()
  const { id, enabled, priority, dailyLimit } = body
  if (!id) return err('Missing key id', 400)

  const key = await db.dailyApiKey.findUnique({ where: { id } })
  if (!key) return err('Key not found', 404)

  const data: Record<string, unknown> = {}
  if (enabled !== undefined) data.enabled = enabled
  if (priority !== undefined) data.priority = priority
  if (dailyLimit !== undefined) data.dailyLimit = dailyLimit

  if (Object.keys(data).length === 0) return err('Nothing to update', 400)

  await db.dailyApiKey.update({ where: { id }, data })
  await auditLog({ actorId: session.sub, actorType: 'platform_admin', action: 'dailyco_key_updated', target: id, metadata: data })
  return ok({ updated: id, ...data })
}

async function remove(req: NextRequest) {
  const session = await requireScope('llm_key:manage')
  const body = await req.json()
  const { id } = body
  if (!id) return err('Missing key id', 400)

  const key = await db.dailyApiKey.findUnique({ where: { id } })
  if (!key) return err('Key not found', 404)

  await db.dailyApiKey.update({ where: { id }, data: { deletedAt: new Date() } })
  await auditLog({ actorId: session.sub, actorType: 'platform_admin', action: 'dailyco_key_deleted', target: id, metadata: { alias: key.alias } })
  return ok({ deleted: id })
}

export const GET = handle(list)
export const POST = handle(create)
export const PATCH = handle(update)
export const DELETE = handle(remove)
