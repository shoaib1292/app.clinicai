import { describe, it, expect } from 'vitest'

describe('LLM Config', () => {
  describe('isReasoningModel()', () => {
    it('should detect GPT-5 as reasoning model', async () => {
      const { isReasoningModel } = await import('../llm-config')
      expect(isReasoningModel('gpt-5')).toBe(true)
    })

    it('should detect GPT-5.4 as reasoning model', async () => {
      const { isReasoningModel } = await import('../llm-config')
      expect(isReasoningModel('gpt-5.4')).toBe(true)
    })

    it('should detect o1 as reasoning model', async () => {
      const { isReasoningModel } = await import('../llm-config')
      expect(isReasoningModel('o1')).toBe(true)
    })

    it('should detect o3 as reasoning model', async () => {
      const { isReasoningModel } = await import('../llm-config')
      expect(isReasoningModel('o3')).toBe(true)
    })

    it('should NOT detect nano models as reasoning', async () => {
      const { isReasoningModel } = await import('../llm-config')
      expect(isReasoningModel('gpt-5-nano')).toBe(false)
      expect(isReasoningModel('gpt-5.4-nano')).toBe(false)
      expect(isReasoningModel('gpt-5-nano-8k')).toBe(false)
    })

    it('should NOT detect gpt-4o as reasoning', async () => {
      const { isReasoningModel } = await import('../llm-config')
      expect(isReasoningModel('gpt-4o')).toBe(false)
    })

    it('should NOT detect gpt-4o-mini as reasoning', async () => {
      const { isReasoningModel } = await import('../llm-config')
      expect(isReasoningModel('gpt-4o-mini')).toBe(false)
    })
  })

  describe('isNanoModel()', () => {
    it('should detect nano models', async () => {
      const { isNanoModel } = await import('../llm-config')
      expect(isNanoModel('gpt-5-nano')).toBe(true)
      expect(isNanoModel('gpt-5.4-nano-8k')).toBe(true)
      expect(isNanoModel('gpt-5-nano-16k')).toBe(true)
    })

    it('should NOT detect non-nano models as nano', async () => {
      const { isNanoModel } = await import('../llm-config')
      expect(isNanoModel('gpt-4o')).toBe(false)
      expect(isNanoModel('gpt-5')).toBe(false)
      expect(isNanoModel('o1')).toBe(false)
    })
  })

  describe('getFallbackModel()', () => {
    it('should return gpt-4.1-mini for nano models', async () => {
      const { getFallbackModel } = await import('../llm-config')
      expect(getFallbackModel('gpt-5-nano')).toBe('gpt-4.1-mini')
    })

    it('should return gpt-4o-mini for reasoning models', async () => {
      const { getFallbackModel } = await import('../llm-config')
      expect(getFallbackModel('gpt-5')).toBe('gpt-4o-mini')
      expect(getFallbackModel('o1')).toBe('gpt-4o-mini')
    })

    it('should return gpt-4o-mini for gpt-4o', async () => {
      const { getFallbackModel } = await import('../llm-config')
      expect(getFallbackModel('gpt-4o')).toBe('gpt-4o-mini')
    })
  })
})
