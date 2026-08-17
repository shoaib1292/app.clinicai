import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signSession, SESSION_COOKIE, hashPhone } from '@/lib/auth'
import { auditLog } from '@/lib/session'
import { requestOrigin } from '@/lib/request-url'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')
  const state = req.nextUrl.searchParams.get('state') || 'staff'

  if (error || !code) {
    console.error('[Google Callback] Error or no code:', error)
    return NextResponse.redirect(new URL('/login?error=google', requestOrigin(req)))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/api/auth/callback/google`

  if (!clientId || !clientSecret) {
    console.error('[Google Callback] Missing credentials')
    return NextResponse.redirect(new URL('/login?error=google', requestOrigin(req)))
  }

  try {
    // Exchange code → tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }).toString(),
    })

    const tokens = await tokenRes.json() as {
      access_token?: string; refresh_token?: string; id_token?: string; error?: string
    }
    if (tokens.error || !tokens.access_token) {
      console.error('[Google Callback] Token exchange failed:', tokens)
      return NextResponse.redirect(new URL('/login?error=google', requestOrigin(req)))
    }

    // Get user info
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const googleUser = await userRes.json() as {
      id?: string; email?: string; name?: string; picture?: string; error?: string
    }
    if (googleUser.error || !googleUser.email) {
      console.error('[Google Callback] User info failed:', googleUser)
      return NextResponse.redirect(new URL('/login?error=google', requestOrigin(req)))
    }

    const email = googleUser.email.toLowerCase().trim()
    const name = googleUser.name || email.split('@')[0]
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

    // Ensure NextAuth User record exists
    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      user = await db.user.create({
        data: { email, name, image: googleUser.picture || null, emailVerified: new Date() },
      })
    } else {
      await db.user.update({
        where: { id: user.id },
        data: { name: name || user.name, image: googleUser.picture || user.image, emailVerified: user.emailVerified || new Date() },
      })
    }

    // Upsert OAuth Account
    await db.account.upsert({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: googleUser.id! } },
      create: {
        userId: user.id, type: 'oauth', provider: 'google',
        providerAccountId: googleUser.id!, access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'Bearer', scope: 'openid profile email',
      },
      update: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
    })

    // Link User to existing role
    await linkExistingUser(email, user.id)

    // ── Route by state ──
    if (state === 'booking') {
      return handlePatientSignIn(req, email, name, ip)
    }

    return handleStaffSignIn(req, email, name, ip)

  } catch (e) {
    console.error('[Google Callback] Unexpected error:', e)
    return NextResponse.redirect(new URL('/login?error=google', requestOrigin(req)))
  }
}

// ── STAFF SIGN-IN ──
async function handleStaffSignIn(req: NextRequest, email: string, name: string, ip: string) {
  // Check each role in priority order

  const admin = await db.platformAdmin.findUnique({ where: { email } })
  if (admin) {
    const token = signSession({ sub: admin.id, type: 'platform_admin', role: admin.role, email, name: admin.name })
    await auditLog({ actorId: admin.id, actorType: 'platform_admin', action: 'login_google', ip })
    const res = NextResponse.redirect(new URL('/dashboard/platform', requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  const staff = await db.platformStaff.findUnique({ where: { email } })
  if (staff) {
    const token = signSession({ sub: staff.id, type: 'platform_staff', role: staff.role, email, name: staff.name })
    await auditLog({ actorId: staff.id, actorType: 'platform_staff', action: 'login_google', ip })
    const res = NextResponse.redirect(new URL('/dashboard/platform', requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  const cadmin = await db.clinicAdmin.findUnique({ where: { email } })
  if (cadmin) {
    if (!cadmin.active) return NextResponse.redirect(new URL('/login?error=Account disabled', requestOrigin(req)))
    const token = signSession({ sub: cadmin.id, type: 'clinic_admin', clinicId: cadmin.clinicId, email, name: cadmin.name })
    await auditLog({ actorId: cadmin.id, actorType: 'clinic_admin', clinicId: cadmin.clinicId, action: 'login_google', ip })
    const res = NextResponse.redirect(new URL('/dashboard/clinic', requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  const doc = await db.doctor.findFirst({ where: { email } })
  if (doc) {
    const token = signSession({ sub: doc.id, type: 'doctor', clinicId: doc.clinicId, email, name: doc.name })
    await auditLog({ actorId: doc.id, actorType: 'doctor', clinicId: doc.clinicId, action: 'login_google', ip })
    const res = NextResponse.redirect(new URL('/dashboard/doctor', requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  const rec = await db.receptionist.findUnique({ where: { email } })
  if (rec) {
    if (!rec.active) return NextResponse.redirect(new URL('/login?error=Account disabled', requestOrigin(req)))
    const token = signSession({ sub: rec.id, type: 'receptionist', clinicId: rec.clinicId, email, name: rec.name })
    await auditLog({ actorId: rec.id, actorType: 'receptionist', clinicId: rec.clinicId, action: 'login_google', ip })
    const res = NextResponse.redirect(new URL('/dashboard/receptionist', requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  const pharm = await db.pharmacist.findUnique({ where: { email } })
  if (pharm) {
    if (!pharm.active) return NextResponse.redirect(new URL('/login?error=Account disabled', requestOrigin(req)))
    const token = signSession({ sub: pharm.id, type: 'pharmacist', clinicId: pharm.clinicId, email, name: pharm.name })
    await auditLog({ actorId: pharm.id, actorType: 'pharmacist', clinicId: pharm.clinicId, action: 'login_google', ip })
    const res = NextResponse.redirect(new URL('/dashboard/pharmacist', requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  const lab = await db.labAdmin.findUnique({ where: { email } })
  if (lab) {
    if (!lab.active) return NextResponse.redirect(new URL('/login?error=Account disabled', requestOrigin(req)))
    const token = signSession({ sub: lab.id, type: 'lab_admin', clinicId: lab.clinicId, email, name: lab.name })
    await auditLog({ actorId: lab.id, actorType: 'lab_admin', clinicId: lab.clinicId, action: 'login_google', ip })
    const res = NextResponse.redirect(new URL('/dashboard/lab-admin', requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  const acct = await db.accountant.findUnique({ where: { email } })
  if (acct) {
    if (!acct.active) return NextResponse.redirect(new URL('/login?error=Account disabled', requestOrigin(req)))
    const token = signSession({ sub: acct.id, type: 'accountant', clinicId: acct.clinicId, email, name: acct.name })
    await auditLog({ actorId: acct.id, actorType: 'accountant', clinicId: acct.clinicId, action: 'login_google', ip })
    const res = NextResponse.redirect(new URL('/dashboard/accountant', requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // ── No staff role found → redirect to signup page (pre-fill email + name) ──
  const signupUrl = new URL('/signup', requestOrigin(req))
  signupUrl.searchParams.set('email', email)
  signupUrl.searchParams.set('name', name)
  signupUrl.searchParams.set('provider', 'google')
  return NextResponse.redirect(signupUrl)
}

// ── PATIENT SIGN-IN (from booking page) ──
async function handlePatientSignIn(req: NextRequest, email: string, name: string, ip: string) {
  // Get the booking path from cookie (set by google-redirect)
  const returnPath = req.cookies.get('google_auth_return')?.value || ''

  // Extract booking token from return path: /b/BASE64TOKEN
  const bookingMatch = returnPath.match(/\/b\/([A-Za-z0-9+/=]+)/)
  let clinicId = ''

  // Decode booking token to get clinicId
  if (bookingMatch) {
    try {
      const decoded = Buffer.from(bookingMatch[1], 'base64').toString('utf-8')
      clinicId = decoded.split(':')[0] || ''
    } catch { /* token may be invalid */ }
  }

  // Try to find existing patient by email
  let patient = await db.patient.findFirst({
    where: { email },
    orderBy: { updatedAt: 'desc' },
  })

  if (patient) {
    // Update with latest Google info
    await db.patient.update({
      where: { id: patient.id },
      data: { name: patient.name || name, email },
    })
    clinicId = clinicId || patient.clinicId
  } else {
    // Auto-create patient
    if (!clinicId) {
      // No clinic context available — need to find one
      const anyClinic = await db.clinic.findFirst({ select: { id: true } })
      clinicId = anyClinic?.id || ''
      if (!clinicId) return NextResponse.redirect(new URL('/login?error=No clinic available', requestOrigin(req)))
    }

    patient = await db.patient.create({
      data: {
        clinicId,
        email,
        name,
        phoneHash: `google:${email}`,
        phoneLast4: '0000',
        phone: '',
        preferredLanguage: 'urdu',
        preferredModality: 'auto',
      },
    })
  }

  // Create patient session
  const patientToken = signSession({
    sub: patient.id,
    type: 'patient',
    clinicId,
    email,
    name: patient.name || name,
    phoneHash: patient.phoneHash,
  })

  // Redirect back to booking page with patient info auto-filled
  if (returnPath) {
    const res = NextResponse.redirect(new URL(returnPath, requestOrigin(req)))
    res.cookies.set(SESSION_COOKIE, patientToken, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    res.cookies.set('google_auth_return', '', { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 0 })
    return res
  }

  // Fallback: redirect to patient portal
  const res = NextResponse.redirect(new URL('/patient-portal', requestOrigin(req)))
  res.cookies.set(SESSION_COOKIE, patientToken, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
  return res
}

async function linkExistingUser(email: string, userId: string) {
  const tables = ['platformAdmin', 'platformStaff', 'clinicAdmin', 'receptionist', 'doctor', 'pharmacist', 'labAdmin', 'accountant'] as const
  for (const table of tables) {
    try {
      await (db as any)[table].updateMany({
        where: { email, userId: null },
        data: { userId },
      })
    } catch { /* table may not exist */ }
  }
}
