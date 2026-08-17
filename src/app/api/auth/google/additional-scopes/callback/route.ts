import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requestOrigin } from '@/lib/request-url'

const SCOPES_MAP: Record<string, string[]> = {
  calendar: [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  meet: [
    'https://www.googleapis.com/auth/calendar.events',
   ],
  gmail: [
    'https://www.googleapis.com/auth/gmail.send',
  ],
  drive: [
    'https://www.googleapis.com/auth/drive.file',
  ],
  contacts: [
    'https://www.googleapis.com/auth/contacts',
  ],
  business: [
    'https://www.googleapis.com/auth/business.manage',
  ],
}

/**
 * GET /api/auth/google/additional-scopes/callback
 * Handles incremental OAuth consent callback when a clinic admin
 * grants additional Google scopes (Calendar, Gmail, Drive, etc.)
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code || !state) {
    console.error('[additional-scopes] Missing code or state:', { error, code: !!code, state })
    return NextResponse.redirect(new URL('/dashboard/settings?tab=google-integration&google=error', requestOrigin(req)))
  }

  const connectionId = state
  const connection = await db.googleConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, clinicId: true, googleEmail: true, scopeSnapshot: true },
  })

  if (!connection) {
    console.error('[additional-scopes] Connection not found:', connectionId)
    return NextResponse.redirect(new URL('/dashboard/settings?tab=google-integration&google=error', requestOrigin(req)))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/api/auth/google/additional-scopes/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/dashboard/settings?tab=google-integration&google=error', requestOrigin(req)))
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })

    const tokens = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      scope?: string
      error?: string
    }

    if (tokens.error || !tokens.access_token) {
      console.error('[additional-scopes] Token exchange failed:', tokens)
      return NextResponse.redirect(new URL('/dashboard/settings?tab=google-integration&google=error', requestOrigin(req)))
    }

    // Store new tokens alongside existing Account
    const account = await db.account.findFirst({
      where: { provider: 'google', providerAccountId: connection.googleEmail },
    })

    if (account) {
      await db.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || account.refresh_token,
          scope: tokens.scope || account.scope,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      })
    }

    // Merge newly granted scopes with what the connection already has. The
    // incremental OAuth response only contains the scopes granted in this
    // request, so overwriting would drop previously granted scopes.
    const existingScopes = (connection.scopeSnapshot || '').split(' ').filter(Boolean)
    const newScopes = (tokens.scope || '').split(' ').filter(Boolean)
    const mergedScopes = [...new Set([...existingScopes, ...newScopes])].join(' ')

    // Store in GoogleToken for connection-scoped access
    const { encrypt } = await import('@/lib/auth')
    await db.googleToken.create({
      data: {
        connectionId: connection.id,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        scope: mergedScopes,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    })

    // Update scope snapshot on connection
    await db.googleConnection.update({
      where: { id: connection.id },
      data: {
        scopeSnapshot: mergedScopes,
      },
    })

    // Auto-enable features based on the full set of granted scopes
    const scopeStr = mergedScopes
    const updates: Record<string, boolean> = {}
    if (scopeStr.includes('calendar')) updates.calendarEnabled = true
    if (scopeStr.includes('gmail.send')) updates.gmailEnabled = true
    if (scopeStr.includes('drive')) updates.driveEnabled = true
    if (scopeStr.includes('contacts')) updates.contactsEnabled = true
    if (scopeStr.includes('business.manage')) updates.businessEnabled = true

    if (Object.keys(updates).length > 0) {
      await db.googleConnection.update({
        where: { id: connection.id },
        data: updates,
      })
    }

    await db.googleAuditLog.create({
      data: {
        clinicId: connection.clinicId,
        connectionId: connection.id,
        action: 'scope_granted',
        metadata: JSON.stringify({ scopes: tokens.scope, enabledFeatures: Object.keys(updates) }),
      },
    })

    return NextResponse.redirect(new URL('/dashboard/settings?tab=google-integration&google=connected', requestOrigin(req)))
  } catch (e) {
    console.error('[additional-scopes] Error:', e)
    return NextResponse.redirect(new URL('/dashboard/settings?tab=google-integration&google=error', requestOrigin(req)))
  }
}
