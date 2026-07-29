/**
 * Voice / STT edge case tests.
 * Tests: audio decode errors, empty transcription, language detection fallback.
 */
import { describe, it, expect } from 'vitest'

describe('Voice Processing', () => {
  describe('transcribeAudio()', () => {
    it('should return error object for empty base64 audio string', async () => {
      const { transcribeAudio } = await import('@/lib/voice')
      const result = await transcribeAudio('')
      expect(result.error).toBeTruthy()
      expect(result.text).toBe('')
    })

    it('should return error for invalid base64 data', async () => {
      const { transcribeAudio } = await import('@/lib/voice')
      const result = await transcribeAudio('bm90LWEtcmVhbC1hdWRpby1maWxl')
      // Should return error object, not throw
      expect(result.error).toBeTruthy()
      expect(result.text).toBe('')
    })
  })

  describe('detectLanguage()', () => {
    it('should fall back to urdu on empty input', async () => {
      const { detectLanguage } = await import('@/lib/voice')
      const lang = detectLanguage('')
      expect(lang).toBe('urdu')
    })

    it('should detect Urdu text', async () => {
      const { detectLanguage } = await import('@/lib/voice')
      const lang = detectLanguage('مجھے ڈاکٹر سے ملنا ہے')
      expect(lang).toBe('urdu')
    })

    it('should detect Roman Urdu text', async () => {
      const { detectLanguage } = await import('@/lib/voice')
      const lang = detectLanguage('mujhe doctor se milna hai')
      expect(lang).toBe('roman-urdu')
    })

    it('should detect English text', async () => {
      const { detectLanguage } = await import('@/lib/voice')
      const lang = detectLanguage('I need to see a doctor please')
      expect(lang).toBe('english')
    })
  })
})
