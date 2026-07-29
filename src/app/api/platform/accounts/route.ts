import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/platform/accounts  — list platform payment accounts
//     Platform admin/staff + clinic admin (read-only) can view.
// POST /api/platform/accounts — create account (platform admin only)
async function list(_req: NextRequest) {
  try {
    await requireType('platform_admin', 'platform_staff')
  } catch {
    const { clinicId } = await requireClinicScope()
    if (!clinicId) return err('Forbidden', 403)
  }
  const accounts = await db.platformAccount.findMany({
    where: { deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return ok(accounts)
}

async function create(req: NextRequest) {
  const session = await requireType('platform_admin')
  const body = await req.json().catch(() => ({}))
  const {
    label, bankName, accountTitle, accountNumber, iban, walletType,
    walletNumber, instructionsText, isDefault,
  } = body as {
    label?: string; bankName?: string; accountTitle?: string; accountNumber?: string;
    iban?: string; walletType?: string; walletNumber?: string; instructionsText?: string; isDefault?: boolean
  }
  if (!label || !bankName || !accountTitle || !accountNumber) {
    return err('label, bankName, accountTitle, accountNumber required', 400)
  }

  if (isDefault) {
    await db.platformAccount.updateMany({ where: { isDefault: true, deletedAt: null }, data: { isDefault: false } })
  }

  const account = await db.platformAccount.create({
    data: {
      label,
      bankName,
      accountTitle,
      accountNumber,
      iban: iban || null,
      walletType: walletType || null,
      walletNumber: walletNumber || null,
      instructionsText: instructionsText || null,
      isDefault: !!isDefault,
      createdById: session.sub,
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'platform_account_created',
    target: account.id,
    metadata: { label, bankName, isDefault: !!isDefault },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(account)
}

export const GET = handle(list)
export const POST = handle(create)
