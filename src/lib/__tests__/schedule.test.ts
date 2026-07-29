/**
 * Schedule/Slot module unit tests.
 * Tests: fee computation, slot generation, queue modes.
 */
import { describe, it, expect } from 'vitest'

describe('Schedule Module', () => {
  describe('computeFees()', () => {
    it('should compute fees correctly with default platform fee', async () => {
      const { computeFees } = await import('@/lib/schedule')
      const result = computeFees({
        doctorFee: 500,
        clinicMarkup: 100,
        platformFeeDefault: 50,
      })
      expect(result.doctorFee).toBe(500)
      expect(result.clinicMarkup).toBe(100)
      expect(result.platformFee).toBe(50)
      expect(result.appointmentFee).toBe(150)
      expect(result.total).toBe(650)
    })

    it('should apply platform fee override', async () => {
      const { computeFees } = await import('@/lib/schedule')
      const result = computeFees({
        doctorFee: 1000,
        clinicMarkup: 0,
        platformFeeDefault: 50,
        platformFeeOverride: 30,
      })
      expect(result.platformFee).toBe(30) // override applied
      expect(result.appointmentFee).toBe(30)
      expect(result.total).toBe(1030)
    })

    it('should handle zero fees', async () => {
      const { computeFees } = await import('@/lib/schedule')
      const result = computeFees({
        doctorFee: 0,
        clinicMarkup: 0,
        platformFeeDefault: 50,
      })
      expect(result.doctorFee).toBe(0)
      expect(result.clinicMarkup).toBe(0)
      expect(result.platformFee).toBe(50)
      expect(result.appointmentFee).toBe(50)
      expect(result.total).toBe(50)
    })
  })
})
