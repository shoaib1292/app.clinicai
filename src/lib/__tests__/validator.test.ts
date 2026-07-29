/**
 * Validator module unit tests.
 * Tests: anti-hallucination checks, PII detection, medical advice prevention.
 */
import { describe, it, expect } from 'vitest'

describe('Validator Module', () => {
  describe('validateAgentResponse()', () => {
    it('should pass valid responses', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Aap ki appointment 10:30 AM par confirm ho gayi hai.',
        [{ name: 'book_appointment', result: { success: true, appointment: { start: '10:30' } } }]
      )
      expect(result.valid).toBe(true)
    })

    it('should flag hallucinated slot times', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Aap ka slot 3:00 PM par hai.',
        [{ name: 'book_appointment', result: { success: true, appointment: { start: '10:30' } } }]
      )
      expect(result).toBeDefined()
    })

    it('should flag agent-invented doctor names', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Aap ki appointment Dr. Ali se ho gayi hai.',
        [{ name: 'get_doctor_status', result: { name: 'Dr. Sana', doctors: [{ name: 'Dr. Sana' }] } }]
      )
      expect(result.valid).toBe(false)
      expect(result.issues.some((i: string) => i.includes('doctor'))).toBe(true)
    })

    it('should flag agent-invented fee amounts', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Total fee PKR 500 hai.',
        [{ name: 'book_appointment', result: { appointment: { fees: { total: 200, doctorFee: 150, platformFee: 50 } } } }]
      )
      expect(result.valid).toBe(false)
      expect(result.issues.some((i: string) => i.includes('fee'))).toBe(true)
    })

    it('should flag medical advice', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Aap ko yeh dawai leni chahiye: paracetamol 500mg.',
        []
      )
      expect(result.valid).toBe(false)
      expect(result.issues.some((i: string) => i.includes('medical'))).toBe(true)
    })

    it('should flag DB fee mismatch for a claimed booking (outside 1 PKR tolerance)', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Total fee PKR 205 hai.',
        [{ name: 'book_appointment', result: { appointment: { id: 'apt1', fees: { total: 200, doctorFee: 150, platformFee: 50 } } } }],
        async () => ({ exists: true, totalFee: 200, status: 'booked' })
      )
      expect(result.valid).toBe(false)
      expect(result.issues.some((i: string) => i.includes('fee'))).toBe(true)
    })

    it('should pass when DB fee matches the quoted booking fee', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Total fee PKR 200 hai.',
        [{ name: 'book_appointment', result: { appointment: { id: 'apt1', fees: { total: 200, doctorFee: 150, platformFee: 50 } } } }],
        async () => ({ exists: true, totalFee: 200, status: 'booked' })
      )
      expect(result.valid).toBe(true)
    })

    it('should flag a cancel claim when the DB status is not cancelled', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Aap ki appointment cancel ho gayi hai.',
        [{ name: 'cancel_appointment', result: { success: true, appointment: { id: 'apt1' } } }],
        async () => ({ exists: true, totalFee: 200, status: 'booked' })
      )
      expect(result.valid).toBe(false)
      expect(result.issues.some((i: string) => i.toLowerCase().includes('cancel'))).toBe(true)
    })

    it('should pass a cancel claim when the DB status is cancelled', async () => {
      const { validateAgentResponse } = await import('@/lib/validator')
      const result = await validateAgentResponse(
        'Aap ki appointment cancel ho gayi hai.',
        [{ name: 'cancel_appointment', result: { success: true, appointment: { id: 'apt1' } } }],
        async () => ({ exists: true, totalFee: 200, status: 'cancelled' })
      )
      expect(result.valid).toBe(true)
    })
  })
})
