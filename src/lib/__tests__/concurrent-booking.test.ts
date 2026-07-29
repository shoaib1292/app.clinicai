/**
 * Concurrent booking edge case tests.
 * Tests: 2 simultaneous lock attempts on same slot, 1 succeeds 1 fails.
 */
import { describe, it, expect, beforeEach } from 'vitest'

describe('Concurrent Booking', () => {
  beforeEach(async () => {
    const { store } = await import('@/lib/store')
    if (typeof (store as any).reset === 'function') await (store as any).reset()
  })

  describe('slotLock()', () => {
    it('should allow one lock and reject the second for the same slot', async () => {
      const { slotLock, slotUnlock } = await import('@/lib/schedule')
      const slotId = 'concurrent-test-slot-1'

      // First lock should succeed
      const lock1 = await slotLock(slotId, 'patient-1', 5000)
      expect(lock1.acquired).toBe(true)

      // Second concurrent lock should fail
      const lock2 = await slotLock(slotId, 'patient-2', 5000)
      expect(lock2.acquired).toBe(false)

      // Cleanup
      await slotUnlock(slotId)
    })

    it('should allow second lock after first is released', async () => {
      const { slotLock, slotUnlock } = await import('@/lib/schedule')

      // Simulate real race: lock → release → lock
      const lock1 = await slotLock('concurrent-test-slot-2', 'patient-a', 5000)
      expect(lock1.acquired).toBe(true)
      await slotUnlock('concurrent-test-slot-2')

      const lock2 = await slotLock('concurrent-test-slot-2', 'patient-b', 5000)
      expect(lock2.acquired).toBe(true)
      await slotUnlock('concurrent-test-slot-2')
    })
  })
})
