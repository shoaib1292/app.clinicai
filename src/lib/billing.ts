/**
 * Wallet billing helpers — centralised credit/debit math for the clinic wallet.
 *
 * These functions are the single source of truth for `clinic.creditBalance`
 * and the `CreditLedger` journal. They are kept framework-free so they can be
 * unit-tested without a running server.
 *
 * Model (founder doc):
 * - A clinic top-up is CREDITED IMMEDIATELY when the proof is submitted (so the
 *   clinic admin can use the balance right away), UNLESS the clinic is in a
 *   HELD window (a prior fake screenshot) — then the credit is withheld until
 *   the platform confirms.
 * - If a top-up is REJECTED, the credit is reversed with a single debit (the
 *   amount that was credited). That is the only reversal — "utny hi credits
 *   nikal jayen gy". If the funds were already spent, the balance goes negative.
 * - Platform can CORRECT a wrong amount at confirm time; the delta is applied
 *   as an adjustment ledger entry.
 * - A confirmed-fake screenshot sets requirePreVerify + heldUntil = now + 3 days.
 *   While held, the wallet credit is withheld on submit. After heldUntil the
 *   window auto-clears (see maybeClearPreVerify) and any pending held proofs
 *   auto-credit.
 *
 * All balance mutations are wrapped in a Prisma transaction so a concurrent
 * top-up + debit cannot produce a lost update.
 */
import { db } from './db'

export interface BalanceResult {
  balanceAfter: number
  delta?: number
}

/** Credit a top-up to the clinic wallet immediately. */
export async function creditTopup(
  clinicId: string,
  amount: number,
  proofId: string,
): Promise<BalanceResult> {
  return db.$transaction(async (tx) => {
    const clinic = await tx.clinic.findUnique({ where: { id: clinicId } })
    if (!clinic) throw new Error('Clinic not found')
    const balanceAfter = clinic.creditBalance + amount
    await tx.creditLedger.create({
      data: {
        clinicId,
        type: 'credit',
        amount,
        reason: 'topup',
        paymentProofId: proofId,
        balanceAfter,
      },
    })
    await tx.clinic.update({ where: { id: clinicId }, data: { creditBalance: balanceAfter } })
    return { balanceAfter }
  })
}

/**
 * Correct a previously-submitted clinic top-up amount.
 * Adjusts the wallet by the delta between the corrected and original amount
 * (credit if increased, debit if decreased) and records a ledger entry so the
 * correction is auditable. Used by the platform finance confirmation step.
 */
export async function applyTopupCorrection(
  proofId: string,
  oldAmount: number,
  newAmount: number,
): Promise<BalanceResult> {
  if (oldAmount === newAmount) return { balanceAfter: 0 }
  const delta = newAmount - oldAmount

  return db.$transaction(async (tx) => {
    const proof = await tx.paymentProof.findUnique({
      where: { id: proofId },
      include: { clinic: true },
    })
    if (!proof) throw new Error('Payment proof not found')

    const balanceAfter = proof.clinic.creditBalance + delta
    await tx.creditLedger.create({
      data: {
        clinicId: proof.clinicId,
        type: delta > 0 ? 'credit' : 'debit',
        amount: Math.abs(delta),
        reason: 'topup_correction',
        paymentProofId: proofId,
        balanceAfter,
      },
    })
    await tx.clinic.update({ where: { id: proof.clinicId }, data: { creditBalance: balanceAfter } })
    return { balanceAfter, delta }
  })
}

/** Reverse a previously-credited top-up (used on reject). Balance may go negative. */
export async function reverseTopup(proofId: string): Promise<BalanceResult> {
  return db.$transaction(async (tx) => {
    const proof = await tx.paymentProof.findUnique({
      where: { id: proofId },
      include: { clinic: true },
    })
    if (!proof) throw new Error('Payment proof not found')

    const creditEntry = await tx.creditLedger.findFirst({
      where: { paymentProofId: proofId, type: 'credit', reason: 'topup' },
      orderBy: { createdAt: 'desc' },
    })
    const amount = creditEntry?.amount ?? proof.amount
    const balanceAfter = proof.clinic.creditBalance - amount

    await tx.creditLedger.create({
      data: {
        clinicId: proof.clinicId,
        type: 'debit',
        amount,
        reason: 'topup_reversal',
        paymentProofId: proofId,
        balanceAfter,
      },
    })
    await tx.clinic.update({ where: { id: proof.clinicId }, data: { creditBalance: balanceAfter } })
    return { balanceAfter }
  })
}

/**
 * Apply the fake-screenshot consequence.
 *
 * Per the agreed model a confirmed-fake proof is reversed with a SINGLE debit
 * (handled by reverseTopup, called before this). This helper only records the
 * fraud flag and starts the 3-day held window:
 *  - increment fakeProofCount and stamp lastFakeAt
 *  - set requirePreVerify = true so all FUTURE top-ups are HELD (no credit on
 *    submit) until the platform confirms
 *  - set heldUntil = now + 3 days; after that the window auto-clears and any
 *    pending held proofs auto-credit (see maybeClearPreVerify)
 *
 * There is NO extra penalty debit — "utny hi credits nikal jayen gy".
 */
export async function applyFakeScreenshotPenalty(proofId: string): Promise<BalanceResult> {
  const proof = await db.paymentProof.findUnique({
    where: { id: proofId },
    select: { clinicId: true },
  })
  if (!proof) throw new Error('Payment proof not found')

  const HELD_WINDOW_DAYS = 3
  const clinic = await db.clinic.update({
    where: { id: proof.clinicId },
    data: {
      fakeProofCount: { increment: 1 },
      lastFakeAt: new Date(),
      requirePreVerify: true,
      heldUntil: new Date(Date.now() + HELD_WINDOW_DAYS * 24 * 60 * 60 * 1000),
    },
    select: { creditBalance: true },
  })
  return { balanceAfter: clinic.creditBalance }
}

/**
 * Clear the pre-verify / held window once the 3-day window has elapsed.
 * Called from the confirm route (and any periodic job). When heldUntil is in
 * the past, the gate lifts automatically — no clean-confirm count required.
 * Any pending held top-up proofs for the clinic are then auto-credited
 * ("us k baad foran credits mil jayen gy").
 * Returns true if the window was cleared.
 */
export async function maybeClearPreVerify(clinicId: string): Promise<boolean> {
  const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
  if (!clinic || !clinic.requirePreVerify) return false

  // Window elapsed → auto-clear and release any held credits.
  if (clinic.heldUntil && clinic.heldUntil.getTime() <= Date.now()) {
    await db.clinic.update({
      where: { id: clinicId },
      data: { requirePreVerify: false, heldUntil: null },
    })
    await releaseExpiredHeldProofs(clinicId)
    return true
  }
  return false
}

/**
 * Credit any pending HELD top-up proofs for a clinic whose held window has
 * elapsed. A held proof is one still pending/verified with a "HELD:" note.
 * Called by maybeClearPreVerify after the 3-day window passes.
 */
export async function releaseExpiredHeldProofs(clinicId: string): Promise<number> {
  const held = await db.paymentProof.findMany({
    where: {
      clinicId,
      ledgerType: 'clinic_topup',
      status: { in: ['pending', 'verified'] },
      notes: { startsWith: 'HELD:' },
    },
  })
  let released = 0
  for (const proof of held) {
    try {
      await creditTopup(clinicId, proof.amount, proof.id)
      await db.paymentProof.update({
        where: { id: proof.id },
        data: { notes: null, status: 'confirmed', confirmedAt: new Date(), confirmedBy: 'system' },
      })
      released++
    } catch (e) {
      console.error('[billing] expired held proof release failed', e)
    }
  }
  return released
}
