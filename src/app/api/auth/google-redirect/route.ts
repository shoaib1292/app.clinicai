import { NextRequest, NextResponse } from 'next/server'
import { GOOGLE_BASE_SCOPES, GOOGLE_CONNECT_SCOPES, googleAuthUrl } from '@/lib/google-scopes'

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/api/auth/callback/google`
  const from = req.nextUrl.searchParams.get('from') || 'staff'
  const returnPath = req.nextUrl.searchParams.get('redirect') || ''
  const clinicId = req.nextUrl.searchParams.get('clinicId') || ''

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 500 })
  }

  // "connect"/"onboarding" mean the clinic admin is granting full Google
  // integration scopes, not just signing in.
  const isConnect = from === 'connect' || from === 'onboarding'
  const scopes = isConnect ? GOOGLE_CONNECT_SCOPES : GOOGLE_BASE_SCOPES

  // Encode connect context into state so the callback knows to create a
  // GoogleConnection instead of routing through the normal staff sign-in.
  const state = isConnect && clinicId ? `connect:${clinicId}:${from}` : from

  const googleUrl = googleAuthUrl({ clientId, redirectUri, state, scopes })
  const res = NextResponse.redirect(googleUrl)

  if (returnPath) {
    res.cookies.set('google_auth_return', returnPath, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 300 })
  }

  return res
}
