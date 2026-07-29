import { db } from './db'

interface NoShowCheckInput {
  patientId: string
  noShowCount: number
  totalVisits: number
}

interface NoShowCheckResult {
  blocked: boolean
  message?: string
  count: number
}

export function checkNoShowPolicy(input: NoShowCheckInput): NoShowCheckResult {
  // Block if 3+ no-shows in the last 90 days
  if (input.noShowCount >= 3) {
    return {
      blocked: true,
      message: 'Aap ki 3 se zyada appointments no-show hain. Kripya clinic ja kar rabta karein.',
      count: input.noShowCount,
    }
  }

  // Flag for prepayment if any recent no-shows
  if (input.noShowCount > 0) {
    return {
      blocked: false,
      message: 'Aap ki pichli appointments no-show hui hain. Is appointment ke liye advance payment zaroori hai.',
      count: input.noShowCount,
    }
  }

  return { blocked: false, count: 0 }
}
