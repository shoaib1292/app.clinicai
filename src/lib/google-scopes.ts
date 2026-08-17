// Shared Google OAuth scope definitions and auth URL builder.

// Minimal scopes used for authentication-only sign-in.
export const GOOGLE_BASE_SCOPES = ['openid', 'profile', 'email']

// Scopes requested when a clinic admin connects Google for full integration.
// Restricted scopes (gmail.send, business.manage) are requested incrementally
// via the additional-scopes consent flow when the admin toggles those features.
export const GOOGLE_CONNECT_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/contacts',
]

export function googleAuthUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  scopes: string[]
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: params.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: params.state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`
}
