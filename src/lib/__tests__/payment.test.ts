/**
 * Payment proof edge case tests.
 * Tests: wrong amount screenshot, wrong bank, low confidence rejection.
 */
import { describe, it, expect } from 'vitest'

describe('Payment Proof Validation', () => {
  describe('validatePaymentProof()', () => {
    it('should reject when amount does not match appointment fee', async () => {
      const { validatePaymentProof } = await import('@/lib/payment')
      const result = await validatePaymentProof({
        appointmentId: 'appt-1',
        expectedAmount: 500,
        submittedAmount: 300, // mismatch
        bankName: 'Meezan',
        expectedBank: 'Meezan',
      })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/amount|mismatch/i)
    })

    it('should reject when bank name does not match clinic bank', async () => {
      const { validatePaymentProof } = await import('@/lib/payment')
      const result = await validatePaymentProof({
        appointmentId: 'appt-2',
        expectedAmount: 500,
        submittedAmount: 500,
        bankName: 'HBL',
        expectedBank: 'Meezan',
      })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/bank/i)
    })

    it('should flag low-confidence screenshots for manual review', async () => {
      const { validatePaymentProof } = await import('@/lib/payment')
      // Simulate a screenshot with low OCR confidence
      const result = await validatePaymentProof({
        appointmentId: 'appt-3',
        expectedAmount: 1000,
        submittedAmount: 1000,
        bankName: 'Meezan',
        expectedBank: 'Meezan',
        ocrConfidence: 0.45, // below 0.5 threshold
      })
      expect(result.needsReview).toBe(true)
    })

    it('should accept valid payment proofs', async () => {
      const { validatePaymentProof } = await import('@/lib/payment')
      const result = await validatePaymentProof({
        appointmentId: 'appt-4',
        expectedAmount: 750,
        submittedAmount: 750,
        bankName: 'Meezan',
        expectedBank: 'Meezan',
        ocrConfidence: 0.92,
      })
      expect(result.valid).toBe(true)
      expect(result.needsReview).toBe(false)
    })
  })
})
