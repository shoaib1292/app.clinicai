/**
 * Retry wrapper with exponential backoff for Google API calls.
 */
import { isRetryable, mapGoogleError } from './google-errors'

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  context?: string
}

const DEFAULT: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  context: 'API call',
}

/**
 * Execute a function with exponential backoff retry.
 * Retries on retryable errors (rate limits, server errors, network issues).
 * Throws immediately on non-retryable errors (auth, permissions, not found).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, context } = { ...DEFAULT, ...opts }

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      // Don't retry non-retryable errors
      if (!isRetryable(err)) {
        throw new Error(mapGoogleError(err, context))
      }

      // Last attempt — give up
      if (attempt === maxRetries) {
        throw new Error(mapGoogleError(err, context))
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt),
        maxDelayMs,
      ) * (0.5 + Math.random() * 0.5) // 50-100% jitter

      console.warn(`[google:retry] ${context} — attempt ${attempt + 1}/${maxRetries}, waiting ${Math.round(delay)}ms`)
      await sleep(delay)
    }
  }

  throw new Error(mapGoogleError(lastError, context))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
