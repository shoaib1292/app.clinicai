import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, err, notFound, handle } from '@/lib/api'
import { hasScope } from '@/lib/google-token-manager'

export const POST = handle(async (req: NextRequest, _ctx: { params: Promise<{ id: string }> }) => {
  const { clinicId } = await requireClinicScope()

  const body = await req.json() as { feature?: string; enabled?: boolean }
  const { feature, enabled } = body

  if (!feature || typeof enabled !== 'boolean') {
    return err('feature and enabled are required')
  }

  const validFeatures = ['calendar', 'meet', 'gmail', 'drive', 'contacts', 'business']
  if (!validFeatures.includes(feature)) {
    return err(`Invalid feature. Must be one of: ${validFeatures.join(', ')}`)
  }

  const connection = await db.googleConnection.findFirst({ where: { clinicId } })
  if (!connection) return notFound('No Google connection found. Sign in with Google first.')
  if (connection.status !== 'active') return err('Google connection is not active')

  if (enabled) {
    const requiredScope = getRequiredScope(feature)
    const hasReqScope = await hasScope(connection.id, requiredScope)
    if (!hasReqScope) {
      const consentUrl = buildConsentUrl(connection.id, feature)
      return ok({ needsConsent: true, consentUrl, feature })
    }
  }

  const featureField = `${feature}Enabled`
  await db.googleConnection.update({
    where: { id: connection.id },
    data: { [featureField]: enabled },
  })

  return ok({ [featureField]: enabled })
})

function getRequiredScope(feature: string): string {
  const scopeMap: Record<string, string> = {
    calendar: 'https://www.googleapis.com/auth/calendar.events',
    meet: 'https://www.googleapis.com/auth/calendar.events',
    gmail: 'https://www.googleapis.com/auth/gmail.send',
    drive: 'https://www.googleapis.com/auth/drive.file',
    contacts: 'https://www.googleapis.com/auth/contacts',
    business: 'https://www.googleapis.com/auth/business.manage',
  }
  return scopeMap[feature] || ''
}

function buildConsentUrl(connectionId: string, feature: string): string {
  const scopes = getRequiredScope(feature)
  const callbackUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/api/auth/google/additional-scopes/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: connectionId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
