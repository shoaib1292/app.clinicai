/**
 * Payment proof validation module.
 * Validates submitted payment proofs against expected amounts and bank accounts.
 */

export interface PaymentValidationInput {
  appointmentId: string
  expectedAmount: number
  submittedAmount: number
  bankName: string
  expectedBank: string
  ocrConfidence?: number
}

export interface PaymentValidationResult {
  valid: boolean
  reason?: string
  needsReview: boolean
}

/**
 * Validate a payment proof submission.
 * Checks: amount matches appointment fee, bank matches clinic bank, OCR confidence.
 */
export async function validatePaymentProof(input: PaymentValidationInput): Promise<PaymentValidationResult> {
  const issues: string[] = []

  if (input.submittedAmount !== input.expectedAmount) {
    issues.push('amount_mismatch')
  }

  if (input.bankName.toLowerCase() !== input.expectedBank.toLowerCase()) {
    issues.push('bank_mismatch')
  }

  const needsReview = (input.ocrConfidence ?? 1) < 0.5

  if (issues.length > 0) {
    return { valid: false, reason: issues.join(', '), needsReview }
  }

  return { valid: true, needsReview }
}
