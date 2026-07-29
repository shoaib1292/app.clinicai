import { describe, it, expect } from 'vitest'
import { validateAgentResponse } from '@/lib/validator'

describe('debug', () => {
  it('cancel db status', async () => {
    const r = await validateAgentResponse(
      'Aap ki appointment cancel ho gayi hai.',
      [{ name: 'cancel_appointment', result: { success: true, appointment: { id: 'apt1' } } }],
      async () => ({ exists: true, totalFee: 200, status: 'booked' })
    )
    // Agent claimed cancel but DB status is still "booked" → must be flagged invalid.
    expect(r.valid).toBe(false)
    expect(r.shouldRegenerate).toBe(true)
    expect(r.issues.some((i: string) => i.toLowerCase().includes('cancel'))).toBe(true)
  })
})
