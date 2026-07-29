/**
 * No-show policy edge case tests.
 * Tests: 3rd no-show triggers block, agent refuses booking.
 */
import { describe, it, expect } from 'vitest'

describe('No-Show Policy', () => {
  describe('checkNoShowPolicy()', () => {
    it('should block booking after 3 no-shows', async () => {
      const { checkNoShowPolicy } = await import('@/lib/no-show-policy')
      const result = checkNoShowPolicy({
        patientId: 'patient-no-show-heavy',
        noShowCount: 3,
        totalVisits: 5,
      })
      expect(result.blocked).toBe(true)
      expect(result.message).toBeTruthy()
    })

    it('should allow booking with 0 no-shows', async () => {
      const { checkNoShowPolicy } = await import('@/lib/no-show-policy')
      const result = checkNoShowPolicy({
        patientId: 'patient-reliable',
        noShowCount: 0,
        totalVisits: 10,
      })
      expect(result.blocked).toBe(false)
      expect(result.count).toBe(0)
    })

    it('should allow booking with 2 no-shows (under threshold)', async () => {
      const { checkNoShowPolicy } = await import('@/lib/no-show-policy')
      const result = checkNoShowPolicy({
        patientId: 'patient-borderline',
        noShowCount: 2,
        totalVisits: 8,
      })
      expect(result.blocked).toBe(false)
    })

    it('should warn at 2 no-shows', async () => {
      const { checkNoShowPolicy } = await import('@/lib/no-show-policy')
      const result = checkNoShowPolicy({
        patientId: 'patient-warning',
        noShowCount: 2,
        totalVisits: 3,
        warnAt: 2,
      })
      expect(result.blocked).toBe(false)
      // 2 no-shows are under the 3-no-show block threshold but still flagged
      expect(result.count).toBe(2)
      expect(result.message).toBeTruthy()
    })
  })
})
