import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { encrypt } from '@/lib/auth'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function list() {
  await requireType('platform_admin')
  const keys = await db.lLMKey.findMany({
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { callLogs: true } } },
  })
  return ok(keys.map((k) => ({
    id: k.id,
    provider: k.provider,
    alias: k.alias,
    encryptedKey: '••••' + k.encryptedKey.slice(-4),
    keyMasked: '••••' + k.encryptedKey.slice(-4),
    priority: k.priority,
    dailyBudgetUsd: k.dailyBudgetUsd,
    enabled: k.enabled,
    lastError: k.lastError,
    lastUsedAt: k.lastUsedAt,
    callCount: k._count.callLogs,
    createdAt: k.createdAt,
  })))
}

async function create(req: NextRequest) {
  const session = await requireType('platform_admin')
  const body = await req.json()
  const { provider, alias, apiKey, priority, dailyBudgetUsd } = body
  if (!provider || !alias || !apiKey) return err('Missing fields', 400)
  try {
    const key = await db.lLMKey.create({
      data: {
        provider,
        alias,
        encryptedKey: encrypt(apiKey),
        priority: priority ?? 1,
        dailyBudgetUsd: dailyBudgetUsd ?? 10,
        enabled: true,
        addedById: session.sub,
      },
    })
    await auditLog({ actorId: session.sub, actorType: 'platform_admin', action: 'llm_key_added', target: key.id, metadata: { provider, alias } })
    return ok({ id: key.id })
  } catch (createErr) {
    console.error('[llm-keys] create failed:', createErr)
    return err('Failed to save key. Check your encryption key and try again.', 500)
  }
}

async function remove(req: NextRequest) {
  const session = await requireType('platform_admin')
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return err('Missing key id', 400)
  const key = await db.lLMKey.findUnique({ where: { id } })
  if (!key) return err('Key not found', 404)
  // Null out call log references before deleting
  await db.lLMCallLog.updateMany({ where: { keyId: id }, data: { keyId: null } })
  await db.lLMKey.delete({ where: { id } })
  await auditLog({ actorId: session.sub, actorType: 'platform_admin', action: 'llm_key_deleted', target: id, metadata: { provider: key.provider, alias: key.alias } })
  return ok({ deleted: true })
}

export const GET = handle(list)
export const POST = handle(create)
export const DELETE = handle(remove)
