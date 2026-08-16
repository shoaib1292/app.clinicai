import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { signSession, verifyPassword, SESSION_COOKIE } from '@/lib/auth'
import { auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { ensurePlatformAdmin } from '@/lib/ensure-platform-admin'

interface LoginBody {
  email: string
  password: string
}

async function login(req: NextRequest) {
  const body = (await req.json()) as LoginBody
  const email = body.email?.toLowerCase().trim()
  const password = body.password
  if (!email || !password) return err('Email and password required', 400)

  // Self-heal: ensure the platform admin exists (sourced from env vars).
  await ensurePlatformAdmin()

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

  // 1. Platform Admin
  const admin = await db.platformAdmin.findUnique({ where: { email } })
  if (admin) {
    const valid = await verifyPassword(password, admin.passwordHash)
    if (!valid) return err('Invalid credentials', 401)
    const token = signSession({ sub: admin.id, type: 'platform_admin', role: admin.role, email: admin.email, name: admin.name })
    await auditLog({ actorId: admin.id, actorType: 'platform_admin', action: 'login', ip })
    const res = ok({ type: 'platform_admin', role: admin.role, name: admin.name, redirectTo: '/dashboard/platform' })
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // 2. Platform Staff
  const staff = await db.platformStaff.findUnique({ where: { email } })
  if (staff) {
    if (!staff.active) return err('Account disabled', 403)
    const valid = await verifyPassword(password, staff.passwordHash)
    if (!valid) return err('Invalid credentials', 401)
    const token = signSession({ sub: staff.id, type: 'platform_staff', role: staff.role, email: staff.email, name: staff.name })
    await auditLog({ actorId: staff.id, actorType: 'platform_staff', action: 'login', ip })
    const res = ok({ type: 'platform_staff', role: staff.role, name: staff.name, redirectTo: '/dashboard/platform' })
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // 3. Clinic Admin
  const cadmin = await db.clinicAdmin.findUnique({ where: { email } })
  if (cadmin) {
    if (!cadmin.active) return err('Account disabled', 403)
    // Email verification required — users who signed up via Google are auto-verified,
    // but password signups must verify their email before onboarding/dashboard access.
    if (!cadmin.emailVerified) return err('Please verify your email first. Check your inbox for the verification link.', 403)
    const valid = await verifyPassword(password, cadmin.passwordHash)
    if (!valid) return err('Invalid credentials', 401)
    const token = signSession({ sub: cadmin.id, type: 'clinic_admin', clinicId: cadmin.clinicId, email: cadmin.email, name: cadmin.name })
    await auditLog({ actorId: cadmin.id, actorType: 'clinic_admin', clinicId: cadmin.clinicId, action: 'login', ip })
    const res = ok({ type: 'clinic_admin', name: cadmin.name, redirectTo: '/dashboard/clinic' })
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // 4. Receptionist
  const rec = await db.receptionist.findUnique({ where: { email } })
  if (rec) {
    if (!rec.active) return err('Account disabled', 403)
    if (!rec.emailVerified) return err('Please verify your email first. Check your inbox for the verification link.', 403)
    const valid = await verifyPassword(password, rec.passwordHash)
    if (!valid) return err('Invalid credentials', 401)
    const token = signSession({ sub: rec.id, type: 'receptionist', clinicId: rec.clinicId, email: rec.email, name: rec.name })
    await auditLog({ actorId: rec.id, actorType: 'receptionist', clinicId: rec.clinicId, action: 'login', ip })
    const res = ok({ type: 'receptionist', name: rec.name, redirectTo: '/dashboard/receptionist' })
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // 5. Doctor
  const doc = await db.doctor.findFirst({ where: { email } })
  if (doc) {
    if (!doc.passwordHash) return err('Doctor account not configured for login', 400)
    if (!doc.emailVerified) return err('Please verify your email first. Check your inbox for the verification link.', 403)
    const valid = await verifyPassword(password, doc.passwordHash)
    if (!valid) return err('Invalid credentials', 401)
    const token = signSession({ sub: doc.id, type: 'doctor', clinicId: doc.clinicId, email: doc.email || '', name: doc.name })
    await auditLog({ actorId: doc.id, actorType: 'doctor', clinicId: doc.clinicId, action: 'login', ip })
    const res = ok({ type: 'doctor', name: doc.name, redirectTo: '/dashboard/doctor' })
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // 6. Pharmacist
  const pharm = await db.pharmacist.findUnique({ where: { email } })
  if (pharm) {
    if (!pharm.active) return err('Account disabled', 403)
    if (!pharm.emailVerified) return err('Please verify your email first. Check your inbox for the verification link.', 403)
    const valid = await verifyPassword(password, pharm.passwordHash)
    if (!valid) return err('Invalid credentials', 401)
    const token = signSession({ sub: pharm.id, type: 'pharmacist', clinicId: pharm.clinicId, email: pharm.email, name: pharm.name })
    await auditLog({ actorId: pharm.id, actorType: 'pharmacist', clinicId: pharm.clinicId, action: 'login', ip })
    const res = ok({ type: 'pharmacist', name: pharm.name, redirectTo: '/dashboard/pharmacist' })
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // 7. Lab Admin
  const lab = await db.labAdmin.findUnique({ where: { email } })
  if (lab) {
    if (!lab.active) return err('Account disabled', 403)
    if (!lab.emailVerified) return err('Please verify your email first. Check your inbox for the verification link.', 403)
    const valid = await verifyPassword(password, lab.passwordHash)
    if (!valid) return err('Invalid credentials', 401)
    const token = signSession({ sub: lab.id, type: 'lab_admin', clinicId: lab.clinicId, email: lab.email, name: lab.name })
    await auditLog({ actorId: lab.id, actorType: 'lab_admin', clinicId: lab.clinicId, action: 'login', ip })
    const res = ok({ type: 'lab_admin', name: lab.name, redirectTo: '/dashboard/lab-admin' })
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // 8. Accountant
  const acct = await db.accountant.findUnique({ where: { email } })
  if (acct) {
    if (!acct.active) return err('Account disabled', 403)
    if (!acct.emailVerified) return err('Please verify your email first. Check your inbox for the verification link.', 403)
    const valid = await verifyPassword(password, acct.passwordHash)
    if (!valid) return err('Invalid credentials', 401)
    const token = signSession({ sub: acct.id, type: 'accountant', clinicId: acct.clinicId, email: acct.email, name: acct.name })
    await auditLog({ actorId: acct.id, actorType: 'accountant', clinicId: acct.clinicId, action: 'login', ip })
    const res = ok({ type: 'accountant', name: acct.name, redirectTo: '/dashboard/accountant' })
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  return err('Invalid credentials', 401)
}

export const POST = handle(login)
