import { chromium } from '@playwright/test'
import { db } from '../src/lib/db'
import { signSession } from '../src/lib/auth'
import { readFileSync, writeFileSync } from 'fs'

async function main() {
  const admin = await db.clinicAdmin.findFirst({ where: { email: 'admin@al-shifa.pk' } })
  if (!admin) { console.log('no admin'); process.exit(1) }
  const token = signSession({ sub: admin.id, type: 'clinic_admin', clinicId: admin.clinicId, email: admin.email, name: admin.name, twoFactorVerified: false })
  writeFileSync('session_token.txt', token)
  console.log('token written')

  const base = 'http://localhost:8000'
  const cookie = `clinicsai_session=${token}`

  async function time(url: string) {
    const t0 = Date.now()
    const res = await fetch(url, { headers: { cookie } })
    const j = await res.json()
    const dt = Date.now() - t0
    return { status: res.status, ok: j.ok, ms: dt, keys: j.data ? Object.keys(j.data).length : 0, err: j.error }
  }

  // warm up (first compile)
  await time(`${base}/api/analytics/clinic`)
  await time(`${base}/api/analytics/clinic/advanced`)

  console.log('--- timed runs ---')
  for (let i = 0; i < 3; i++) {
    const a = await time(`${base}/api/analytics/clinic`)
    const b = await time(`${base}/api/analytics/clinic/advanced`)
    console.log(`run${i}: clinic=${a.ms}ms(ok=${a.ok},keys=${a.keys})  advanced=${b.ms}ms(ok=${b.ok},keys=${b.keys},err=${b.err})`)
  }
  await db.$disconnect()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
