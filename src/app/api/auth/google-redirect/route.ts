import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/api/auth/callback/google`
  const from = req.nextUrl.searchParams.get('from') || 'staff'
  const returnPath = req.nextUrl.searchParams.get('redirect') || ''

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    access_type: 'offline',
    prompt: 'consent',
    state: from,
  })

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  const res = NextResponse.redirect(googleUrl)

  // Store return path in a short-lived cookie so callback can use it
  if (returnPath) {
    res.cookies.set('google_auth_return', returnPath, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 300 })
  }

  return res
}
