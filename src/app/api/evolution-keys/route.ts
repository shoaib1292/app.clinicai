import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/auth'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function list() {
  await requireType('platform_admin')
  const keys = await db.evolutionApiKey.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return ok(keys.map((k) => ({
    id: k.id,
    alias: k.alias,
    encryptedKey: '••••' + k.encryptedKey.slice(-4),
    baseUrl: k.baseUrl,
    enabled: k.enabled,
    lastError: k.lastError,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
  })))
}

async function create(req: NextRequest) {
  const session = await requireType('platform_admin')
  const body = await req.json()
  const { alias, apiKey, baseUrl } = body
  if (!alias || !apiKey) return err('Alias and API key are required', 400)
  try {
    const key = await db.evolutionApiKey.create({
      data: {
        alias,
        encryptedKey: encrypt(apiKey),
        baseUrl: baseUrl || 'https://evo.clinicai.pk',
        enabled: true,
        addedById: session.sub,
      },
    })
    await auditLog({ actorId: session.sub, actorType: 'platform_admin', action: 'evolution_key_added', target: key.id, metadata: { alias } })
    return ok({ id: key.id })
  } catch (createErr) {
    console.error('[evolution-keys] create failed:', createErr)
    return err('Failed to save key. Check your encryption key and try again.', 500)
  }
}

async function remove(req: NextRequest) {
  const session = await requireType('platform_admin')
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return err('Missing key id', 400)
  const key = await db.evolutionApiKey.findUnique({ where: { id } })
  if (!key) return err('Key not found', 404)
  await db.evolutionApiKey.delete({ where: { id } })
  await auditLog({ actorId: session.sub, actorType: 'platform_admin', action: 'evolution_key_deleted', target: id, metadata: { alias: key.alias } })
  return ok({ deleted: true })
}

export const GET = handle(list)
export const POST = handle(create)
export const DELETE = handle(remove)
