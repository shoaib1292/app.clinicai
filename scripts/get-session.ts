import { db } from '../src/lib/db'
import { signSession } from '../src/lib/auth'

async function main() {
  const admin = await db.clinicAdmin.findFirst({ where: { email: 'admin@al-shifa.pk' } })
  if (!admin) throw new Error('no admin')
  const token = signSession({
    sub: admin.id, type: 'clinic_admin', clinicId: admin.clinicId,
    email: admin.email, name: admin.name, twoFactorVerified: false,
  })
  require('fs').writeFileSync('session_token.txt', token)
  console.log('token written, clinicId', admin.clinicId)
}
main().catch((e) => { console.error(e); process.exit(1) })
