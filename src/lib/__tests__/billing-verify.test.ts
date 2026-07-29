/**
 * Billing helper tests — credit / reverse / correction math.
 * Mocks @/lib/db so the wallet balance logic can be tested without a DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const creditLedger: any[] = []
const clinics: Record<string, any> = {}

const dbMock = {
  $transaction: async (fn: (tx: any) => any) => fn(dbMock),
  clinic: {
    findUnique: vi.fn(async ({ where }: any) => clinics[where.id] || null),
    update: vi.fn(async ({ where, data }: any) => {
      Object.assign(clinics[where.id], data)
      return clinics[where.id]
    }),
  },
  creditLedger: {
    create: vi.fn(async ({ data }: any) => {
      const row = { id: `led-${creditLedger.length + 1}`, ...data }
      creditLedger.push(row)
      return row
    }),
    findFirst: vi.fn(async ({ where, orderBy }: any) => {
      const matches = creditLedger.filter((l) => {
        if (where.paymentProofId && l.paymentProofId !== where.paymentProofId) return false
        if (where.type && l.type !== where.type) return false
        if (where.reason && l.reason !== where.reason) return false
        return true
      })
      if (orderBy?.createdAt === 'desc') matches.reverse()
      return matches[0] || null
    }),
  },
  paymentProof: {
    findUnique: vi.fn(async ({ where }: any) => proofs[where.id] || null),
  },
}

const proofs: Record<string, any> = {}

vi.mock('@/lib/db', () => ({ db: dbMock }))

beforeEach(() => {
  creditLedger.length = 0
  for (const k of Object.keys(clinics)) delete clinics[k]
  for (const k of Object.keys(proofs)) delete proofs[k]
  dbMock.clinic.findUnique.mockClear()
  dbMock.clinic.update.mockClear()
  dbMock.creditLedger.create.mockClear()
  dbMock.creditLedger.findFirst.mockClear()
  dbMock.paymentProof.findUnique.mockClear()
})

describe('billing helpers', () => {
  it('creditTopup credits the wallet immediately', async () => {
    clinics['c1'] = { id: 'c1', creditBalance: 1000 }
    const { creditTopup } = await import('@/lib/billing')
    const r = await creditTopup('c1', 5000, 'p1')
    expect(r.balanceAfter).toBe(6000)
    expect(clinics['c1'].creditBalance).toBe(6000)
    expect(creditLedger[0]).toMatchObject({ type: 'credit', amount: 5000, reason: 'topup', paymentProofId: 'p1' })
  })

  it('reverseTopup reverses the credit (balance can go negative)', async () => {
    clinics['c1'] = { id: 'c1', creditBalance: 6000 }
    creditLedger.push({ id: 'l1', clinicId: 'c1', type: 'credit', amount: 5000, reason: 'topup', paymentProofId: 'p1', balanceAfter: 6000 })
    // spend some so the clinic is left negative after reversal
    clinics['c1'] = { id: 'c1', creditBalance: 1500 }
    proofs['p1'] = { id: 'p1', clinicId: 'c1', ledgerType: 'clinic_topup', amount: 5000, clinic: clinics['c1'] }
    const { reverseTopup } = await import('@/lib/billing')
    const r = await reverseTopup('p1')
    expect(r.balanceAfter).toBe(-3500)
    expect(creditLedger[creditLedger.length - 1]).toMatchObject({ type: 'debit', amount: 5000, reason: 'topup_reversal' })
  })

  it('applyTopupCorrection records a delta and updates balance', async () => {
    clinics['c1'] = { id: 'c1', creditBalance: 10000 }
    proofs['p2'] = { id: 'p2', clinicId: 'c1', ledgerType: 'clinic_topup', amount: 5000, clinic: clinics['c1'] }
    const { applyTopupCorrection } = await import('@/lib/billing')
    const r = await applyTopupCorrection('p2', 5000, 3000) // admin corrected down
    expect(r.delta).toBe(-2000)
    expect(r.balanceAfter).toBe(8000)
    expect(creditLedger[creditLedger.length - 1]).toMatchObject({ type: 'debit', amount: 2000, reason: 'topup_correction' })

    const r2 = await applyTopupCorrection('p2', 3000, 7000) // corrected up
    expect(r2.delta).toBe(4000)
    expect(r2.balanceAfter).toBe(12000)
    expect(creditLedger[creditLedger.length - 1]).toMatchObject({ type: 'credit', amount: 4000, reason: 'topup_correction' })
  })
})
