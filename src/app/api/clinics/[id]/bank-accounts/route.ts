import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// GET /api/clinics/[id]/bank-accounts  — list bank accounts for the clinic
async function list(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Either clinic-scoped user (matching clinic) OR platform admin/staff
  try {
    await requireType('platform_admin', 'platform_staff')
  } catch {
    const { clinicId } = await requireClinicScope()
    if (clinicId !== id) return err('Forbidden', 403)
  }
  const accounts = await db.clinicBankAccount.findMany({
    where: { clinicId: id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return ok(accounts)
}

// POST /api/clinics/[id]/bank-accounts — create bank account
async function create(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let session
  try {
    session = await requireType('platform_admin', 'platform_staff')
  } catch {
    const cs = await requireClinicScope()
    if (cs.clinicId !== id) return err('Forbidden', 403)
    session = cs.session
  }

  const body = await req.json().catch(() => ({}))
  const { bankName, accountTitle, accountNumber, iban, walletType, walletNumber, instructionsText, isDefault } = body as {
    bankName?: string; accountTitle?: string; accountNumber?: string; iban?: string;
    walletType?: string; walletNumber?: string; instructionsText?: string; isDefault?: boolean
  }
  if (!bankName || !accountTitle || !accountNumber) return err('bankName, accountTitle, accountNumber required', 400)

  // If marking as default, unset others
  if (isDefault) {
    await db.clinicBankAccount.updateMany({ where: { clinicId: id, isDefault: true }, data: { isDefault: false } })
  }

  const account = await db.clinicBankAccount.create({
    data: {
      clinicId: id,
      bankName,
      accountTitle,
      accountNumber,
      iban: iban || null,
      walletType: walletType || null,
      walletNumber: walletNumber || null,
      instructionsText: instructionsText || null,
      isDefault: !!isDefault,
    },
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: id,
    action: 'bank_account_created',
    target: account.id,
    metadata: { bankName, accountTitle, isDefault: !!isDefault },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(account)
}

export const GET = handle(list)
export const POST = handle(create)
