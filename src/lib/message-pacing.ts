/**
 * Message Pacing — word-count-based typing delay + triage detection.
 *
 * WhatsApp (Evolution) ban-risk mitigation layer. Instead of a fixed random
 * delay, the reply's word count drives a natural typing pace:
 *   delay = clamp(wordCount * WORD_DELAY_MS, MIN_DELAY_MS, MAX_DELAY_MS)
 *
 * Emergency/triage replies skip the delay entirely so urgent escalations are
 * not held up by artificial pacing.
 */

const WORD_DELAY_MS = Number(process.env.PACING_WORD_DELAY_MS) || 300
const MIN_DELAY_MS = Number(process.env.PACING_MIN_DELAY_MS) || 2500
const MAX_DELAY_MS = Number(process.env.PACING_MAX_DELAY_MS) || 15000
const TRIAGE_MIN_DELAY_MS = Number(process.env.PACING_TRIAGE_DELAY_MS) || 500

export function calculateTypingDelay(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const delay = Math.round(wordCount * WORD_DELAY_MS)
  return Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, delay))
}

export interface PacingConfig {
  typingMs: number
  isTriage: boolean
}

/**
 * Determine pacing config from agent result.
 * If the agent called transfer_to_human (emergency escalation), use a
 * drastically reduced delay so the patient gets the emergency message fast.
 */
export function getPacingConfig(reply: string, toolCalls: Array<{ name: string; result: unknown }>): PacingConfig {
  const escalated = toolCalls.some(
    (tc) => tc.name === 'transfer_to_human',
  )
  if (escalated) {
    return { typingMs: TRIAGE_MIN_DELAY_MS, isTriage: true }
  }
  return { typingMs: calculateTypingDelay(reply), isTriage: false }
}

export { WORD_DELAY_MS, MIN_DELAY_MS, MAX_DELAY_MS, TRIAGE_MIN_DELAY_MS }
