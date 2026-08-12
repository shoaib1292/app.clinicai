import { db } from '@/lib/db'
import { getAccessToken } from '@/lib/google-token-manager'

export interface ConnectionHealth {
  connectionId: string
  clinicId: string
  googleEmail: string
  status: 'active' | 'expired' | 'revoked' | 'error'
  features: {
    calendar: boolean
    meet: boolean
    gmail: boolean
    drive: boolean
    contacts: boolean
    business: boolean
  }
  tokenValid: boolean
  tokenExpiresAt: Date | null
  scopes: string[]
  lastSyncAt: Date | null
  lastError: string | null
  lastErrorAt: Date | null
  daysSinceConnected: number
}

/**
 * Check the health of all active Google connections.
 * Verifies token validity and marks expired connections.
 */
export async function checkConnectionHealth(connectionId: string, clinicId: string): Promise<ConnectionHealth | null> {
  const connection = await db.googleConnection.findUnique({
    where: { id: connectionId },
    include: {
      tokens: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!connection || connection.status === 'revoked') return null

  const token = connection.tokens[0]
  let tokenValid = false
  let tokenExpiresAt: Date | null = null

  if (token) {
    tokenExpiresAt = token.expiresAt

    if (new Date() >= token.expiresAt) {
      // Try refresh
      const accessToken = await getAccessToken(connectionId)
      tokenValid = !!accessToken

      if (!tokenValid) {
        await db.googleConnection.update({
          where: { id: connectionId },
          data: {
            status: 'expired',
            lastError: 'Token expired and refresh failed',
            lastErrorAt: new Date(),
          },
        })
      }
    } else {
      tokenValid = true
    }
  }

  // If connection was marked error but token recovered, restore
  if (connection.status === 'error' && tokenValid) {
    await db.googleConnection.update({
      where: { id: connectionId },
      data: { status: 'active', lastError: null, lastErrorAt: null },
    })
  }

  const daysConnected = Math.floor(
    (Date.now() - connection.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  )

  return {
    connectionId: connection.id,
    clinicId: connection.clinicId,
    googleEmail: connection.googleEmail,
    status: tokenValid && connection.status !== 'expired' ? 'active' : connection.status as ConnectionHealth['status'],
    features: {
      calendar: connection.calendarEnabled,
      meet: connection.meetEnabled,
      gmail: connection.gmailEnabled,
      drive: connection.driveEnabled,
      contacts: connection.contactsEnabled,
      business: connection.businessEnabled,
    },
    tokenValid,
    tokenExpiresAt,
    scopes: token?.scope ? token.scope.split(' ') : [],
    lastSyncAt: connection.lastCalendarSyncAt,
    lastError: connection.lastError,
    lastErrorAt: connection.lastErrorAt,
    daysSinceConnected: daysConnected,
  }
}

/**
 * Warn if token expires within 24 hours.
 */
export function isTokenExpiringSoon(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
}
