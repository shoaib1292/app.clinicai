/**
 * Filter module unit tests.
 * Tests: message filtering, clinic resolution, deduplication.
 */
import { describe, it, expect, beforeEach } from 'vitest'

describe('Filter Module', () => {
  beforeEach(async () => {
    const { store } = await import('@/lib/store')
    if (typeof (store as any).reset === 'function') await (store as any).reset()
  })

  describe('filterInboundMessage()', () => {
    it('should filter out group messages (@g.us)', async () => {
      const { filterInboundMessage } = await import('@/lib/filter')
      const result = filterInboundMessage({
        from: '1234567890@s.whatsapp.net',
        type: 'text',
        body: 'Hello',
        hasMedia: false,
        chatId: '1234567890-123456@g.us',
      } as any)
      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toBe('group')
    })

    it('should filter out status broadcasts', async () => {
      const { filterInboundMessage } = await import('@/lib/filter')
      const result = filterInboundMessage({
        from: 'status@broadcast',
        type: 'text',
        body: 'Status update',
        hasMedia: false,
      } as any)
      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toBe('status')
    })

    it('should allow legitimate 1:1 messages', async () => {
      const { filterInboundMessage } = await import('@/lib/filter')
      const result = filterInboundMessage({
        from: '923001234567',
        type: 'text',
        body: 'Mujhe appointment chahiye',
        hasMedia: false,
      } as any)
      expect(result.shouldProcess).toBe(true)
    })
  })

  describe('Webhook Replay Dedup', () => {
    it('should deduplicate the same providerMsgId within 24h window', async () => {
      const { isDuplicateMessage } = await import('@/lib/filter')
      const msgId = 'webhook-replay-test-id-123'

      // First occurrence — should be false (not a duplicate)
      const first = await isDuplicateMessage(msgId)
      expect(first).toBe(false)

      // Second occurrence — should be true (duplicate detected)
      const second = await isDuplicateMessage(msgId)
      expect(second).toBe(true)
    })

    it('should handle multiple unique message IDs independently', async () => {
      const { isDuplicateMessage } = await import('@/lib/filter')

      const id1 = 'independent-test-1'
      const id2 = 'independent-test-2'

      const r1 = await isDuplicateMessage(id1)
      expect(r1).toBe(false)

      const r2 = await isDuplicateMessage(id2)
      expect(r2).toBe(false) // id2 has never been seen — not a duplicate

      const r1again = await isDuplicateMessage(id1)
      expect(r1again).toBe(true) // id1 was seen before
    })
  })

  describe('isDuplicateMessage()', () => {
    it('should return false for new messages', async () => {
      const { isDuplicateMessage } = await import('@/lib/filter')
      const result = await isDuplicateMessage('unique_msg_123')
      expect(result).toBe(false)
    })

    it('should return true for duplicate messages', async () => {
      const { isDuplicateMessage } = await import('@/lib/filter')
      await isDuplicateMessage('dup_test_id')
      const result = await isDuplicateMessage('dup_test_id')
      expect(result).toBe(true)
    })
  })
})
