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
  // Mask the key
  return ok(keys.map((k) => ({
    id: k.id,
    provider: k.provider,
    alias: k.alias,
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
}

export const GET = handle(list)
export const POST = handle(create)
