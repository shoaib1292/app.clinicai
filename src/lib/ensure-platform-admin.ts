/**
 * Boot-time platform admin seeding.
 * Ensures a platform admin account always exists, sourced from environment
 * variables so credentials can be rotated via Coolify/`.env` without running
 * a manual seed script.
 */
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

let ensured = false

export async function ensurePlatformAdmin(): Promise<void> {
  if (ensured) return
  ensured = true

  const email = (process.env.PLATFORM_ADMIN_EMAIL || '').toLowerCase().trim()
  const password = process.env.PLATFORM_ADMIN_PASSWORD || ''

  // No admin credentials configured — nothing to seed.
  if (!email) return

  const passwordHash = password ? await hashPassword(password) : ''

  const existing = await db.platformAdmin.findUnique({ where: { email } })

  if (existing) {
    // Keep credentials in sync with env (email may be same, password may rotate).
    if (passwordHash && existing.passwordHash !== passwordHash) {
      await db.platformAdmin.update({
        where: { id: existing.id },
        data: { passwordHash },
      })
    }
    return
  }

  // Create a new platform admin. Name derived from email local-part.
  const name = process.env.PLATFORM_ADMIN_NAME || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  await db.platformAdmin.create({
    data: {
      email,
      name,
      passwordHash: passwordHash || 'unset', // login will always fail if no password is set
      role: 'super_admin',
      twoFactorEnabled: false,
    },
  })

  console.log(`[boot] Platform admin ensured: ${email}`)
}
