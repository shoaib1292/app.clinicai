/**
 * Google API Error Mapper
 * Translates raw Google API errors into user-friendly, actionable messages.
 * Per taste: never expose raw technical error strings to users.
 */

interface GoogleApiError {
  code?: number
  errors?: Array<{ message?: string; reason?: string; domain?: string }>
}

export function mapGoogleError(err: unknown, context: string): string {
  const code = (err as GoogleApiError)?.code
  const reason = (err as GoogleApiError)?.errors?.[0]?.reason
  const msg = getDefaultMessage(code, reason)

  return msg
}

function getDefaultMessage(code?: number, reason?: string): string {
  if (code === 401 || reason === 'authError') {
    return 'Google authentication failed. Please check your account permissions.'
  }
  if (code === 403 || reason === 'forbidden' || reason === 'insufficientPermissions') {
    return 'Permission was denied. Please grant the required permissions to continue.'
  }
  if (code === 404 || reason === 'notFound') {
    return 'The Google resource was not found. It may have been deleted or moved.'
  }
  if (code === 429 || reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
    return 'Google is temporarily limiting requests. Please wait a moment and try again.'
  }
  if (code === 409 || reason === 'duplicate') {
    return 'A matching record already exists. No changes were needed.'
  }
  if (code === 410) {
    return 'This Google resource is no longer available.'
  }
  if (code === 500 || reason === 'backendError') {
    return 'Google services are temporarily unavailable. Please try again in a few minutes.'
  }
  if (reason === 'invalidGrant') {
    return 'Google access has expired. Please reconnect your Google account.'
  }
  if (reason === 'invalidParameter' || reason === 'required') {
    return 'The request could not be processed. Some information was missing or invalid.'
  }

  return 'An unexpected error occurred with Google services. Please try again later.'
}

/**
 * Check if an error is retryable.
 * Retry on: rate limits, transient server errors, network issues.
 * Don't retry on: invalid auth, missing resources, bad requests.
 */
export function isRetryable(err: unknown): boolean {
  const code = (err as GoogleApiError)?.code
  const reason = (err as GoogleApiError)?.errors?.[0]?.reason

  // Rate limits — always retry
  if (code === 429) return true

  // Server errors — retry
  if (code === 500 || code === 502 || code === 503) return true

  // Backend errors — retry
  if (reason === 'backendError') return true

  // Auth errors — don't retry (need token refresh, handled separately)
  if (code === 401) return false

  // Permission errors — don't retry
  if (code === 403) return false

  // Not found — don't retry
  if (code === 404) return false

  // Network/timeout — retry
  if (code === undefined && reason === undefined) return true

  return false
}
