// Quick script to enable patient portal for first active clinic
// Run: npx tsx scripts/seed-portal.ts

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  // 1. Find first active clinic
  const clinic = await db.clinic.findFirst({
    where: { status: 'active' },
    select: { id: true, name: true, slug: true, patientPortalEnabled: true },
  })

  if (!clinic) {
    console.log('❌ No active clinic found. Create one first.')
    process.exit(1)
  }

  console.log(`Found clinic: ${clinic.name} (${clinic.slug})`)

  // 2. Enable portal + set branding
  if (!clinic.patientPortalEnabled) {
    await db.clinic.update({
      where: { id: clinic.id },
      data: {
        patientPortalEnabled: true,
        brandingPrimaryColor: '#0891b2',
        brandingSecondaryColor: '#06b6d4',
      },
    })
    console.log('✅ Portal enabled + branding set')
  } else {
    console.log('ℹ️  Portal already enabled')
  }

  // 3. Create a test PatientAppUser
  const testPhone = '+923001234567'
  const { hashPhone, last4 } = await import('../src/lib/auth')
  const phoneHash = hashPhone(testPhone)

  let appUser = await db.patientAppUser.findUnique({ where: { phoneHash } })
  if (!appUser) {
    appUser = await db.patientAppUser.create({
      data: { phone: testPhone, phoneHash },
    })
    console.log(`✅ PatientAppUser created: ${testPhone}`)
  } else {
    console.log(`ℹ️  PatientAppUser exists: ${testPhone}`)
  }

  // 4. Generate magic link
  const { randomToken } = await import('../src/lib/auth')
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.patientMagicLink.create({
    data: {
      token,
      appUserId: appUser.id,
      clinicId: clinic.id,
      phone: testPhone,
      expiresAt,
    },
  })

  const domain = process.env.DOMAIN || 'localhost:8000'
  const protocol = domain.includes('localhost') ? 'http' : 'https'
  const link = `${protocol}://${domain}/p/${clinic.slug}?t=${token}`

  console.log('')
  console.log('🔗 COPY THIS LINK AND OPEN IN BROWSER:')
  console.log(`   ${link}`)
  console.log('')
  console.log(`   Token: ${token}`)
  console.log(`   Expires: ${expiresAt.toISOString()}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
