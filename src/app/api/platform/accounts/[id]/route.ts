import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// PATCH /api/platform/accounts/[id] — update (platform admin only)
// DELETE /api/platform/accounts/[id] — soft delete (platform admin only)
async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('platform_admin')
  const body = await req.json().catch(() => ({}))
  const {
    label, bankName, accountTitle, accountNumber, iban, walletType,
    walletNumber, instructionsText, isDefault,
  } = body as {
    label?: string; bankName?: string; accountTitle?: string; accountNumber?: string;
    iban?: string; walletType?: string; walletNumber?: string; instructionsText?: string; isDefault?: boolean
  }

  const existing = await db.platformAccount.findUnique({ where: { id, deletedAt: null } })
  if (!existing) return err('Account not found', 404)

  if (isDefault) {
    await db.platformAccount.updateMany({ where: { isDefault: true, deletedAt: null, id: { not: id } }, data: { isDefault: false } })
  }

  const account = await db.platformAccount.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(bankName !== undefined ? { bankName } : {}),
      ...(accountTitle !== undefined ? { accountTitle } : {}),
      ...(accountNumber !== undefined ? { accountNumber } : {}),
      ...(iban !== undefined ? { iban } : {}),
      ...(walletType !== undefined ? { walletType } : {}),
      ...(walletNumber !== undefined ? { walletNumber } : {}),
      ...(instructionsText !== undefined ? { instructionsText } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'platform_account_updated',
    target: id,
    metadata: { label: account.label },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(account)
}

async function remove(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('platform_admin')
  const existing = await db.platformAccount.findUnique({ where: { id, deletedAt: null } })
  if (!existing) return err('Account not found', 404)

  await db.platformAccount.update({ where: { id }, data: { deletedAt: new Date() } })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'platform_account_deleted',
    target: id,
    metadata: { label: existing.label },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ deleted: true })
}

export const PATCH = handle(patch)
export const DELETE = handle(remove)
