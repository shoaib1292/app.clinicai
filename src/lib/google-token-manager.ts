import { db } from './db'
import { encrypt, decrypt } from './auth'
import { OAuth2Client } from 'google-auth-library'

/**
 * Token Manager — handles OAuth token storage, retrieval, and refresh.
 * All tokens are AES-256-GCM encrypted before DB storage (reuses auth.ts encrypt/decrypt).
 */

export interface TokenResult {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
  scope: string
}

export async function storeTokens(connectionId: string, tokens: {
  accessToken: string
  refreshToken?: string | null
  idToken?: string | null
  scope: string
  expiresAt: Date
  tokenType?: string
}): Promise<void> {
  await db.googleToken.create({
    data: {
      connectionId,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
      idToken: tokens.idToken ? encrypt(tokens.idToken) : null,
      tokenType: tokens.tokenType || 'Bearer',
      scope: tokens.scope,
      expiresAt: tokens.expiresAt,
    },
  })
}

export async function getAccessToken(connectionId: string): Promise<string | null> {
  const token = await db.googleToken.findFirst({
    where: { connectionId },
    orderBy: { issuedAt: 'desc' },
  })

  if (!token) return null

  // Check if expired, try refresh
  if (new Date() >= token.expiresAt) {
    const refreshed = await refreshTokens(connectionId)
    if (!refreshed) {
      await markConnectionError(connectionId, 'Token expired and refresh failed')
      return null
    }
    return refreshed.accessToken
  }

  return decrypt(token.accessToken)
}

export async function refreshTokens(connectionId: string): Promise<TokenResult | null> {
  const token = await db.googleToken.findFirst({
    where: { connectionId },
    orderBy: { issuedAt: 'desc' },
  })

  if (!token || !token.refreshToken) return null

  const refreshToken = decrypt(token.refreshToken)
  if (!refreshToken) return null

  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/api/auth/callback/google`
    )

    oauth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) return null

    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000)

    await storeTokens(connectionId, {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      idToken: credentials.id_token || null,
      scope: credentials.scope || token.scope,
      expiresAt,
    })

    // Get clinicId for audit log
    const connection = await db.googleConnection.findUnique({
      where: { id: connectionId },
      select: { clinicId: true },
    })
    if (connection?.clinicId) {
      await logAudit(connectionId, connection.clinicId, 'token_refreshed')
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresAt,
      scope: credentials.scope || token.scope,
    }
  } catch {
    await markConnectionError(connectionId, 'Token refresh failed')
    return null
  }
}

export async function revokeConnection(connectionId: string, clinicId: string): Promise<void> {
  const token = await db.googleToken.findFirst({
    where: { connectionId },
    orderBy: { issuedAt: 'desc' },
  })

  if (token?.accessToken) {
    try {
      const oauth2Client = new OAuth2Client()
      oauth2Client.setCredentials({ access_token: decrypt(token.accessToken) })
      await oauth2Client.revokeCredentials()
    } catch {
      // Token might already be invalid — proceed anyway
    }
  }

  // Delete all tokens
  await db.googleToken.deleteMany({ where: { connectionId } })

  // Mark connection as revoked
  await db.googleConnection.update({
    where: { id: connectionId },
    data: { status: 'revoked', lastError: 'User disconnected', lastErrorAt: new Date() },
  })

  await logAudit(connectionId, clinicId, 'connection_revoked')
}

export async function hasScope(connectionId: string, scope: string): Promise<boolean> {
  const token = await db.googleToken.findFirst({
    where: { connectionId },
    orderBy: { issuedAt: 'desc' },
  })

  if (!token) return false
  return token.scope.includes(scope)
}

/**
 * Get an authenticated OAuth2Client for making Google API calls.
 * Automatically refreshes the token if needed.
 */
export async function getOAuth2Client(connectionId: string): Promise<OAuth2Client | null> {
  const accessToken = await getAccessToken(connectionId)
  if (!accessToken) return null

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/api/auth/callback/google`
  )

  oauth2Client.setCredentials({ access_token: accessToken })
  return oauth2Client
}

async function markConnectionError(connectionId: string, error: string): Promise<void> {
  await db.googleConnection.update({
    where: { id: connectionId },
    data: { status: 'error', lastError: error, lastErrorAt: new Date() },
  })
}

async function logAudit(connectionId: string, clinicId: string, action: string): Promise<void> {
  if (!clinicId) return
  try {
    await db.googleAuditLog.create({
      data: { clinicId, connectionId, action },
    })
  } catch {
    // Non-critical
  }
}

export { encrypt, decrypt }
