import { describe, it, expect } from 'vitest'

describe('Agent Types', () => {
  it('should export SESSION_TTL as 7 days', async () => {
    const { SESSION_TTL } = await import('../types')
    expect(SESSION_TTL).toBe(7 * 24 * 60 * 60)
  })

  it('should export HISTORY_WINDOW as 30', async () => {
    const { HISTORY_WINDOW } = await import('../types')
    expect(HISTORY_WINDOW).toBe(30)
  })

  it('should export FAMILY_KEYWORDS with Urdu/English mappings', async () => {
    const { FAMILY_KEYWORDS } = await import('../types')
    expect(FAMILY_KEYWORDS['ammi']).toBe('parent')
    expect(FAMILY_KEYWORDS['biwi']).toBe('spouse')
    expect(FAMILY_KEYWORDS['bhai']).toBe('sibling')
    expect(FAMILY_KEYWORDS['beta']).toBe('child')
    expect(FAMILY_KEYWORDS['mother']).toBe('parent')
    expect(FAMILY_KEYWORDS['husband']).toBe('spouse')
    expect(Object.keys(FAMILY_KEYWORDS).length).toBeGreaterThan(35)
  })
})
