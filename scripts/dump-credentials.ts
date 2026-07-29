import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('# ClinicAI — All Account Credentials\n')
  console.log(`Generated: ${new Date().toISOString().slice(0, 10)}\n`)
  console.log('## Default Password: `ClinicAI@2026`\n')
  console.log('> **Note**: Saare accounts ka password same hai. Password change nahi kiya gaya.\n')

  const clinics = await db.clinic.findMany()

  for (const clinic of clinics) {
    console.log('---')
    console.log(`## ${clinic.name}`)
    console.log(`- **City**: ${clinic.city || 'N/A'}`)
    console.log(`- **Clinic ID**: \`${clinic.id}\`\n`)

    // Clinic Admins
    const admins = await db.clinicAdmin.findMany({ where: { clinicId: clinic.id } })
    if (admins.length > 0) {
      console.log('### Clinic Admin')
      for (const a of admins) {
        console.log(`- **Name**: ${a.name}`)
        console.log(`- **Email**: \`${a.email}\``)
        console.log(`- **Password**: \`ClinicAI@2026\``)
        if (a.twoFactorEnabled) console.log(`- **2FA**: Enabled`)
        console.log()
      }
    }

    // Doctors
    const doctors = await db.doctor.findMany({ where: { clinicId: clinic.id, active: true } })
    if (doctors.length > 0) {
      console.log('### Doctors')
      for (const d of doctors) {
        console.log(`- **Name**: ${d.name}`)
        console.log(`  - Email: \`${d.email || 'N/A'}\``)
        console.log(`  - Password: \`ClinicAI@2026\``)
        console.log(`  - Speciality: ${d.speciality || 'General'}`)
        console.log(`  - Queue Mode: ${d.queueMode}`)
        console.log(`  - Slot Duration: ${d.slotDurationMin} min`)
        if (d.workingHours) {
          try {
            const wh = JSON.parse(String(d.workingHours))
            if (Array.isArray(wh)) {
              const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
              for (const w of wh) console.log(`  - ${days[w.day]}: ${w.startTime}-${w.endTime}`)
            }
          } catch {}
        }
        console.log()
      }
    }

    // Receptionists
    const receptionists = await db.receptionist.findMany({ where: { clinicId: clinic.id, active: true } })
    if (receptionists.length > 0) {
      console.log('### Receptionists')
      for (const r of receptionists) {
        console.log(`- **Name**: ${r.name}`)
        console.log(`- **Email**: \`${r.email}\``)
        console.log(`- **Password**: \`ClinicAI@2026\``)
        console.log()
      }
    }
  }

  // Platform Admins
  console.log('---')
  console.log('## Platform\n')
  const pAdmins = await db.platformAdmin.findMany()
  if (pAdmins.length > 0) {
    console.log('### Super Admin')
    for (const a of pAdmins) {
      console.log(`- **Name**: ${a.name}`)
      console.log(`- **Email**: \`${a.email}\``)
      console.log(`- **Password**: \`ClinicAI@2026\``)
      console.log()
    }
  }

  const pStaff = await db.platformStaff.findMany({ where: { active: true } })
  if (pStaff.length > 0) {
    console.log('### Platform Staff')
    for (const s of pStaff) {
      console.log(`- **Name**: ${s.name}`)
      console.log(`- **Email**: \`${s.email}\``)
      console.log(`- **Password**: \`ClinicAI@2026\``)
      console.log(`- **Role**: ${s.role}`)
      if (s.scopes) {
        try {
          const scopesArr = typeof s.scopes === 'string' ? JSON.parse(s.scopes) : s.scopes
          if (Array.isArray(scopesArr) && scopesArr.length) console.log(`- **Scopes**: ${scopesArr.join(', ')}`)
        } catch {}
      }
      console.log()
    }
  }

  await db.$disconnect()
}

main()
