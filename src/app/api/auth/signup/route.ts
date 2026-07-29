import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, signSession, SESSION_COOKIE, signRefreshToken, REFRESH_COOKIE, cookieSecure, randomToken } from '@/lib/auth'
import { auditLog } from '@/lib/session'
import { sendEmail, templateEmailVerify } from '@/lib/notifications'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'
import { normalizePhone } from '@/lib/phone-utils'

interface SignupBody {
  clinicName: string
  adminName: string
  adminEmail: string
  whatsappNumber: string
  city: string
  password: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function signup(req: NextRequest) {
  const body = (await req.json()) as SignupBody
  const { clinicName, adminName, adminEmail, whatsappNumber, city, password } = body

  if (!clinicName || !adminName || !adminEmail || !whatsappNumber || !city || !password) {
    return err('All fields are required', 400)
  }
  if (password.length < 8) {
    return err('Password must be at least 8 characters', 400)
  }

  const email = adminEmail.toLowerCase().trim()
  const waNumber = whatsappNumber ? normalizePhone(whatsappNumber) : ''

  // Check email uniqueness across all user types
  const [existingAdmin, existingStaff, existingCAdmin, existingRec, existingDoc] = await Promise.all([
    db.platformAdmin.findUnique({ where: { email } }),
    db.platformStaff.findUnique({ where: { email } }),
    db.clinicAdmin.findUnique({ where: { email } }),
    db.receptionist.findUnique({ where: { email } }),
    db.doctor.findFirst({ where: { email } }),
  ])
  if (existingAdmin || existingStaff || existingCAdmin || existingRec || existingDoc) {
    return err('This email is already registered', 409)
  }

  // Build unique slug
  let slug = slugify(clinicName)
  if (!slug) slug = 'clinic'
  let existing = await db.clinic.findUnique({ where: { slug } })
  let suffix = 1
  while (existing) {
    slug = `${slugify(clinicName)}-${suffix}`
    existing = await db.clinic.findUnique({ where: { slug } })
    suffix++
  }

  const passwordHash = await hashPassword(password)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

  // Create everything in a transaction
  // Prisma $extends breaks $transaction callback type inference; explicit cast needed
  const result = await (db.$transaction as any)(async (tx: typeof db) => {
    const clinic = await tx.clinic.create({
      data: {
        name: clinicName.trim(),
        slug,
        city: city.trim(),
        whatsappNumber: whatsappNumber.trim(),
        status: 'trial',
        creditBalance: 1000,
        agentEnabled: true,
        agentName: 'Sana',
        agentGender: 'female',
        agentTone: 'friendly',
        agentLanguages: 'urdu,english,roman-urdu',
        settlementMode: 'credit',
      },
    })

    const admin = await tx.clinicAdmin.create({
      data: {
        clinicId: clinic.id,
        email,
        name: adminName.trim(),
        passwordHash,
        phone: waNumber,
        active: true,
      },
    })

    await tx.creditLedger.create({
      data: {
        clinicId: clinic.id,
        type: 'credit',
        amount: 1000,
        reason: 'signup_bonus',
        balanceAfter: 1000,
      },
    })

    await tx.agentToggle.create({
      data: {
        clinicId: clinic.id,
        enabled: true,
      },
    })

    await tx.lead.create({
      data: {
        clinicName: clinicName.trim(),
        adminName: adminName.trim(),
        whatsappNumber: waNumber,
        city: city.trim(),
        status: 'converted',
        clinicId: clinic.id,
      },
    })

    return { clinicId: clinic.id, adminId: admin.id, name: admin.name }
  })

  await auditLog({ actorId: result.adminId, actorType: 'clinic_admin', clinicId: result.clinicId, action: 'signup', ip })

  // Send verification email
  const verifyToken = randomToken(24)
  await store.set(`email-verify:${verifyToken}`, { userId: result.adminId, userType: 'clinic_admin', email }, 86400) // 24 hours

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinicai.pk'
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`

  try {
    const tpl = templateEmailVerify({ name: result.name, verifyUrl })
    await sendEmail(email, tpl.subject, tpl.html, `Verify your ClinicAI email: ${verifyUrl}`)
  } catch (e) {
    console.error('[signup] Verification email failed:', e)
  }

  // Auto-login
  const token = signSession({
    sub: result.adminId,
    type: 'clinic_admin',
    clinicId: result.clinicId,
    email,
    name: result.name,
    twoFactorVerified: false,
  })
  const { token: refreshToken } = signRefreshToken(result.adminId)

  const res = ok({
    clinicId: result.clinicId,
    adminId: result.adminId,
    name: result.name,
    credits: 1000,
    redirectTo: `/signup/success?clinicId=${result.clinicId}`,
    session: token,
    refresh: refreshToken,
  })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: 'lax',
    path: '/',
    maxAge: 604800,
  })
  return res
}

export const POST = handle(signup)
