/**
 * Per-Patient Message Debounce (Store-based, BullMQ delay).
 *
 * When a patient sends multiple WhatsApp messages in rapid succession, we
 * accumulate them and dispatch a single combined context to the AI agent.
 *
 * Flow:
 *   1. Webhook handler calls debounceAndSchedule().
 *   2. First message: store accumulator → schedule BullMQ job with delay=DEBOUNCE_WINDOW_MS.
 *   3. Subsequent messages within the window: append to accumulator, NO new job.
 *   4. Worker picks up the delayed job → reads accumulated messages → passes
 *      combined text to the AI agent.
 */

import { store } from './store'

const DEBOUNCE_WINDOW_MS = Number(process.env.DEBOUNCE_WINDOW_MS) || 4000

export interface Accumulator {
  messages: string[]
  lastAt: number
}

/**
 * Returns the accumulator key for this patient (per clinicId + phone).
 */
export function debounceKey(clinicId: string, patientPhone: string): string {
  return `debounce:${clinicId}:${patientPhone}`
}

/**
 * Accumulate a message in the store. Returns:
 *   { shouldEnqueue: true,  combined: null } — first message, caller should enqueue a delayed job
 *   { shouldEnqueue: false, combined: null } — window active, message appended, no action needed
 */
export async function debounceMessage(opts: {
  clinicId: string
  patientPhone: string
  userMessage: string
}): Promise<{ shouldEnqueue: boolean }> {
  const key = debounceKey(opts.clinicId, opts.patientPhone)
  const ttl = Math.ceil(DEBOUNCE_WINDOW_MS / 1000) + 2
  const existing = await store.get<Accumulator>(key)

  if (existing) {
    existing.messages.push(opts.userMessage)
    existing.lastAt = Date.now()
    await store.set(key, existing, ttl)
    return { shouldEnqueue: false }
  }

  const acc: Accumulator = {
    messages: [opts.userMessage],
    lastAt: Date.now(),
  }
  await store.set(key, acc, ttl)
  return { shouldEnqueue: true }
}

/**
 * Read and clear the accumulated messages for a patient.
 * Called by the worker before dispatching to the AI agent.
 * Returns the combined text (messages joined with newlines), or null if
 * the accumulator was already flushed/cancelled.
 */
export async function flushAccumulator(clinicId: string, patientPhone: string): Promise<string | null> {
  const key = debounceKey(clinicId, patientPhone)
  const acc = await store.get<Accumulator>(key)
  if (!acc || acc.messages.length === 0) return null
  await store.del(key)
  return acc.messages.join('\n')
}

export { DEBOUNCE_WINDOW_MS }
