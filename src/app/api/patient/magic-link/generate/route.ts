import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { randomToken, hashPhone } from '@/lib/auth'
import { ok, err, handle } from '@/lib/api'

async function generate(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    appUserId?: string
    clinicId?: string
    phone?: string
  }
  const { appUserId, clinicId, phone } = body
  if (!appUserId || !clinicId || !phone) {
    return err('appUserId, clinicId, and phone are required', 400)
  }

  const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
  if (!clinic) return err('Clinic not found', 404)
  if (!clinic.patientPortalEnabled) return err('Patient portal not enabled for this clinic', 403)

  const appUser = await db.patientAppUser.findUnique({ where: { id: appUserId } })
  if (!appUser) return err('Patient not found', 404)

  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  await db.patientMagicLink.create({
    data: {
      token,
      appUserId,
      clinicId,
      phone,
      expiresAt,
    },
  })

  const domain = process.env.DOMAIN || 'localhost:8000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const link = `${protocol}://${domain}/p/${clinic.slug}?t=${token}`

  return ok({ link, expiresAt: expiresAt.toISOString() })
}

export const POST = handle(generate)
