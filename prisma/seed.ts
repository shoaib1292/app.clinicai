/**
 * ClinicAI Seed Script
 * Creates platform admin, platform staff, demo clinics, doctors, receptionists,
 * patients, appointments, conversations, payment proofs, ledger entries — all
 * with data spanning June 12–28, 2026 so the user can test end-to-end.
 *
 * Run: bun run db:seed
 */
import { PrismaClient, type Gender, type AppointmentStatus, type MessageDirection, type MessageType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { hashPhone, encrypt } from '../src/lib/auth'
const db = new PrismaClient()

const PASSWORD = 'ClinicAI@2026' // shared default password for all seeded accounts
const PK_TZ_OFFSET = 5 * 60 * 60 * 1000 // Pakistan UTC+5

// Helper: Pakistan-local date for June 2026
function pkDate(day: number, hour: number, min = 0): Date {
  // June day, 2026, Pakistan time → store as UTC
  return new Date(Date.UTC(2026, 5, day, hour - 5, min, 0))
}

async function main() {
  console.log('🧹 Cleaning existing data...')
  // Wipe in dependency order
  await db.message.deleteMany()
  await db.reminder.deleteMany()
  await db.conversation.deleteMany()
  await db.appointmentFees.deleteMany()
  await db.appointment.deleteMany()
  await db.slot.deleteMany()
  await db.scheduleOverride.deleteMany()
  await db.schedule.deleteMany()
  await db.service.deleteMany()
  await db.patientFamilyMember.deleteMany()
  await db.patient.deleteMany()
  await db.clinicBankAccount.deleteMany()
  await db.agentToggle.deleteMany()
  await db.whatsAppConnection.deleteMany()
  await db.creditLedger.deleteMany()
  await db.paymentProof.deleteMany()
  await db.invoice.deleteMany()
  await db.pricingRule.deleteMany()
  await db.notificationTemplate.deleteMany()
  await db.filteredMessageLog.deleteMany()
  await db.analyticsSnapshot.deleteMany()
  await db.lead.deleteMany()
  await db.platformAppointment.deleteMany()
  await db.receptionist.deleteMany()
  await db.doctor.deleteMany()
  await db.clinicAdmin.deleteMany()
  await db.clinic.deleteMany()
  await db.platformStaff.deleteMany()
  await db.platformAdmin.deleteMany()
  await db.lLMKey.deleteMany()
  await db.lLMCallLog.deleteMany()
  await db.auditLog.deleteMany()

  console.log('🔑 Hashing passwords...')
  const pw = await bcrypt.hash(PASSWORD, 10)

  // ========================================================================
  // 1. PLATFORM ADMIN + STAFF
  // ========================================================================
  console.log('👑 Creating platform admin + staff...')
  const admin = await db.platformAdmin.create({
    data: {
      email: 'admin@clinicsai.pk',
      name: 'Ahsan Khan',
      passwordHash: pw,
      role: 'super_admin',
      twoFactorEnabled: false,
    },
  })

  const salesStaff = await db.platformStaff.create({
    data: {
      email: 'sales@clinicsai.pk',
      name: 'Bilal Ahmed',
      passwordHash: pw,
      role: 'sales',
      scopes: JSON.stringify(['platform:lead:read', 'platform:lead:write', 'platform:appointment:write']),
      active: true,
    },
  })

  const onboardingStaff = await db.platformStaff.create({
    data: {
      email: 'onboarding@clinicsai.pk',
      name: 'Sana Malik',
      passwordHash: pw,
      role: 'onboarding',
      scopes: JSON.stringify(['platform:clinic:read', 'platform:clinic:write', 'platform:appointment:write']),
      active: true,
    },
  })

  const supportStaff = await db.platformStaff.create({
    data: {
      email: 'support@clinicsai.pk',
      name: 'Hina Raza',
      passwordHash: pw,
      role: 'support',
      scopes: JSON.stringify(['platform:clinic:read', 'platform:conversation:read']),
      active: true,
    },
  })

  const financeStaff = await db.platformStaff.create({
    data: {
      email: 'finance@clinicsai.pk',
      name: 'Kamran Sheikh',
      passwordHash: pw,
      role: 'finance',
      scopes: JSON.stringify(['platform:payment:confirm', 'platform:invoice:write', 'platform:ledger:read']),
      active: true,
    },
  })

  // ========================================================================
  // 2. LLM KEY + PRICING RULE
  // ========================================================================
  console.log('🤖 Creating LLM key + pricing rule...')
  await db.lLMKey.create({
    data: {
      provider: 'openai',
      alias: 'openai-default',
      encryptedKey: encrypt(process.env.OPENAI_API_KEY || ''),
      priority: 1,
      dailyBudgetUsd: 50,
      enabled: true,
      addedById: admin.id,
    },
  })

  await db.pricingRule.create({
    data: {
      scope: 'global',
      platformFeeDefault: 50,
      markupMin: 0,
      markupMax: 500,
      markupDefault: 0,
      billingMode: 'credit',
      createdById: admin.id,
    },
  })

  // ========================================================================
  // 3. CLINICS (3 demo clinics)
  // ========================================================================
  console.log('🏥 Creating 3 demo clinics...')
  const clinics = await Promise.all([
    db.clinic.create({
      data: {
        name: 'Al-Shifa Family Clinic',
        slug: 'al-shifa',
        timezone: 'Asia/Karachi',
        currency: 'PKR',
        status: 'active',
        city: 'Karachi',
        phone: '+92-21-34567890',
        address: 'Block 6, PECHS, Karachi',
        metaConnected: false,
        evolutionConnected: true,
        evolutionInstance: 'alshifa-evo',
        onlinePaymentsEnabled: true,
        agentEnabled: true,
        agentName: 'Sana',
        agentGender: 'female',
        agentTone: 'friendly',
        agentLanguages: 'urdu,english,roman-urdu',
        agentWelcome: 'Asalamualaikum! Al-Shifa Family Clinic me aap ka khush aamdeed. Main Sana hoon, appointment lena hai ya koi sawal?',
        agentFallback: 'Mujhe is baare me maloom nahi, clinic se confirm karwa lein.',
        settlementMode: 'credit',
        creditBalance: 5000,
      },
    }),
    db.clinic.create({
      data: {
        name: 'Medicare Hospital',
        slug: 'medicare',
        timezone: 'Asia/Karachi',
        currency: 'PKR',
        status: 'active',
        city: 'Lahore',
        phone: '+92-42-35551234',
        address: 'Gulberg III, Lahore',
        metaConnected: true,
        evolutionConnected: true,
        metaPhoneId: 'medicare-phone-id',
        metaWabaId: 'medicare-waba',
        onlinePaymentsEnabled: true,
        agentEnabled: true,
        agentName: 'Asif',
        agentGender: 'male',
        agentTone: 'formal',
        agentLanguages: 'urdu,english,roman-urdu',
        agentWelcome: 'Asalamualaikum. Medicare Hospital. Main Asif hoon, aap ki madad kar sakta hoon.',
        agentFallback: 'Mujhe maloom nahi, clinic se confirm karwa lein.',
        settlementMode: 'hybrid',
        creditBalance: 12000,
      },
    }),
    db.clinic.create({
      data: {
        name: 'City Dental Care',
        slug: 'city-dental',
        timezone: 'Asia/Karachi',
        currency: 'PKR',
        status: 'trial',
        city: 'Islamabad',
        phone: '+92-51-2345678',
        address: 'F-7 Markaz, Islamabad',
        metaConnected: false,
        evolutionConnected: true,
        evolutionInstance: 'citydental-evo',
        onlinePaymentsEnabled: false,
        agentEnabled: false, // toggled off — for testing
        agentName: 'Ayesha',
        agentGender: 'female',
        agentTone: 'friendly',
        agentLanguages: 'urdu,english,roman-urdu',
        agentWelcome: 'Asalamualaikum! City Dental Care. Main Ayesha hoon.',
        agentFallback: 'Mujhe maloom nahi, clinic se confirm karwa lein.',
        settlementMode: 'credit',
        creditBalance: 800,
        trialEndsAt: pkDate(30, 12),
      },
    }),
  ])

  // ========================================================================
  // 4. CLINIC ADMINS + RECEPTIONISTS + DOCTORS
  // ========================================================================
  console.log('👨‍⚕️ Creating clinic admins, receptionists, doctors...')
  const clinicAdmins: Awaited<ReturnType<typeof db.clinicAdmin.create>>[] = []
  const receptionists: Awaited<ReturnType<typeof db.receptionist.create>>[] = []
  const doctors: Awaited<ReturnType<typeof db.doctor.create>>[] = []

  for (const [idx, clinic] of clinics.entries()) {
    const cadmin = await db.clinicAdmin.create({
      data: {
        email: `admin@${clinic.slug}.pk`,
        name: `${clinic.name.split(' ')[0]} Admin`,
        passwordHash: pw,
        emailVerified: new Date(),
        clinicId: clinic.id,
        phone: `+9230012345${idx}${idx}`,
      },
    })
    clinicAdmins.push(cadmin)

    const rec = await db.receptionist.create({
      data: {
        email: `reception@${clinic.slug}.pk`,
        name: `Reception ${clinic.name.split(' ')[0]}`,
        passwordHash: pw,
        clinicId: clinic.id,
        phone: `+9230012345${idx}${idx + 3}`,
      },
    })
    receptionists.push(rec)

    // Doctor(s)
    const isDental = clinic.slug === 'city-dental'
    const isHospital = clinic.slug === 'medicare'

    const doctorSpecs = isDental
      ? [
          { name: 'Dr. Imran Dental', spec: 'Dentist', gender: 'male', fee: 1500 },
          { name: 'Dr. Fatima Ortho', spec: 'Orthodontist', gender: 'female', fee: 2000 },
        ]
      : isHospital
      ? [
          { name: 'Dr. Usman Cardiac', spec: 'Cardiologist', gender: 'male', fee: 3000 },
          { name: 'Dr. Ayesha Gynae', spec: 'Gynaecologist', gender: 'female', fee: 2500 },
          { name: 'Dr. Salman Pediatric', spec: 'Pediatrician', gender: 'male', fee: 1800 },
        ]
      : [
          { name: 'Dr. Ahmed General', spec: 'General Physician', gender: 'male', fee: 1200 },
          { name: 'Dr. Salma Skin', spec: 'Dermatologist', gender: 'female', fee: 1800 },
        ]

    for (const [di, ds] of doctorSpecs.entries()) {
      const doc = await db.doctor.create({
        data: {
          name: ds.name,
          gender: ds.gender as Gender,
          speciality: ds.spec,
          slotDurationMin: 15,
          queueMode: 'hybrid',
          currentStatus: 'in_clinic',
          workingHours: JSON.stringify({
            mon: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
            tue: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
            wed: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
            thu: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
            fri: { start: '14:00', end: '20:00', breaks: [] },
            sat: { start: '09:00', end: '15:00', breaks: [] },
          }),
          clinicId: clinic.id,
          email: `doctor${di}@${clinic.slug}.pk`,
          passwordHash: pw,
        },
      })
      doctors.push(doc)

      // Create schedules (Mon=1 ... Sun=0)
      for (const dow of [0, 1, 2, 3, 4, 5, 6]) {
        const wh = JSON.parse(doc.workingHours)
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        const dayKey = days[dow]
        const day = wh[dayKey]
        if (day) {
          await db.schedule.create({
            data: {
              doctorId: doc.id,
              dayOfWeek: dow,
              startTime: day.start,
              endTime: day.end,
              breakWindows: JSON.stringify(day.breaks || []),
              isEmergency: false,
            },
          })
        }
      }

      // Services
      await db.service.create({
        data: {
          clinicId: clinic.id,
          doctorId: doc.id,
          name: `${ds.spec} Consultation`,
          durationMin: 15,
          baseFee: ds.fee,
          description: `${ds.spec} consultation with ${ds.name}`,
        },
      })
    }

    // Bank accounts
    await db.clinicBankAccount.create({
      data: {
        clinicId: clinic.id,
        bankName: 'Meezan Bank',
        accountTitle: clinic.name,
        accountNumber: `0123456789${idx}`,
        iban: `PK36MEZN000000012345678${idx}0`,
        walletType: 'easypaisa',
        walletNumber: `0300-123456${idx}`,
        isDefault: true,
        instructionsText: `${clinic.name}, Meezan Bank, Account: 0123456789${idx}, Title: ${clinic.name}, ya Easypaisa 0300-123456${idx}`,
      },
    })

    // Agent toggle
    await db.agentToggle.create({
      data: {
        clinicId: clinic.id,
        enabled: clinic.agentEnabled,
      },
    })

    // WhatsApp connections
    await db.whatsAppConnection.create({
      data: {
        clinicId: clinic.id,
        mode: 'evo',
        phone: clinic.phone || '',
        status: clinic.evolutionConnected ? 'connected' : 'disconnected',
        evoInstanceName: clinic.evolutionInstance,
        filterGroups: true,
        filterStatus: true,
      },
    })
    if (clinic.metaConnected) {
      await db.whatsAppConnection.create({
        data: {
          clinicId: clinic.id,
          mode: 'meta',
          phone: clinic.phone || '',
          status: 'connected',
          metaPhoneId: clinic.metaPhoneId,
          filterGroups: true,
          filterStatus: true,
        },
      })
    }
  }

  // ========================================================================
  // 5. PATIENTS (Pakistani names)
  // ========================================================================
  console.log('🧑 Creating patients...')
  const patientNames = [
    { name: 'Ahmed Raza', gender: 'male', phone: '+923331234561' },
    { name: 'Salma Begum', gender: 'female', phone: '+923331234562' },
    { name: 'Bilal Khan', gender: 'male', phone: '+923331234563' },
    { name: 'Fatima Sheikh', gender: 'female', phone: '+923331234564' },
    { name: 'Imran Qureshi', gender: 'male', phone: '+923331234565' },
    { name: 'Ayesha Siddiqui', gender: 'female', phone: '+923331234566' },
    { name: 'Usman Tariq', gender: 'male', phone: '+923331234567' },
    { name: 'Hina Aslam', gender: 'female', phone: '+923331234568' },
    { name: 'Kamran Yousuf', gender: 'male', phone: '+923331234569' },
    { name: 'Nida Hussain', gender: 'female', phone: '+923331234570' },
    { name: 'Asad Mehmood', gender: 'male', phone: '+923331234571' },
    { name: 'Mariam Iqbal', gender: 'female', phone: '+923331234572' },
    { name: 'Sufyan Ali', gender: 'male', phone: '+923331234573' },
    { name: 'Zainab Bukhari', gender: 'female', phone: '+923331234574' },
    { name: 'Hamza Sheikh', gender: 'male', phone: '+923331234575' },
  ]

  const patients: Array<Awaited<ReturnType<typeof db.patient.create>> & { clinicId: string; clinicIndex: number }> = []
  for (const [ci, clinic] of clinics.entries()) {
    // Each clinic gets a subset of patients (with overlap allowed — same number in 2 clinics = different records)
    for (const [pi, pn] of patientNames.entries()) {
      const phone = pn.phone.slice(0, -1) + String((ci + pi) % 10)
      const p = await db.patient.create({
        data: {
          clinicId: clinic.id,
          phoneHash: hashPhone(phone + clinic.id),
          phoneLast4: phone.slice(-4),
          phone,
          name: pn.name,
          gender: pn.gender as Gender,
          preferredLanguage: 'urdu',
          preferredModality: 'auto',
          optInMarketing: pi % 3 === 0,
          totalVisits: pi,
          noShowCount: pi % 4 === 0 ? Math.floor(pi / 4) : 0,
          metadata: JSON.stringify({ source: 'whatsapp', firstContact: pkDate(12, 9).toISOString() }),
        },
      })
      patients.push({ ...p, clinicId: clinic.id, clinicIndex: ci })

      // Add a family member for some patients
      if (pi === 0) {
        await db.patientFamilyMember.create({
          data: {
            patientId: p.id,
            clinicId: clinic.id,
            name: 'Salma (Mother)',
            gender: 'female',
            relation: 'parent',
            notes: 'Blood pressure patient',
          },
        })
        await db.patientFamilyMember.create({
          data: {
            patientId: p.id,
            clinicId: clinic.id,
            name: 'Ali (Son)',
            gender: 'male',
            relation: 'child',
            notes: '10 years old',
          },
        })
      }
    }
  }

  // ========================================================================
  // 6. APPOINTMENTS (June 12-28, 2026) — varied statuses
  // ========================================================================
  console.log('📅 Generating slots + appointments (June 12-28, 2026)...')

  for (const clinic of clinics) {
    const clinicDoctors = doctors.filter((d) => d.clinicId === clinic.id)
    const clinicPatients = patients.filter((p) => p.clinicId === clinic.id)
    const clinicServices = await db.service.findMany({ where: { clinicId: clinic.id } })

    // Generate slots for each doctor for each day June 12-28
    for (const doc of clinicDoctors) {
      for (let day = 12; day <= 28; day++) {
        const dateOnly = new Date(Date.UTC(2026, 5, day))
        const dayOfWeek = dateOnly.getDay()
        const schedule = await db.schedule.findFirst({
          where: { doctorId: doc.id, dayOfWeek },
        })
        if (!schedule) continue

        const duration = doc.slotDurationMin
        let cursor = Number(schedule.startTime.split(':')[0]) * 60 + Number(schedule.startTime.split(':')[1])
        const endMin = Number(schedule.endTime.split(':')[0]) * 60 + Number(schedule.endTime.split(':')[1])
        let breaks: { start: number; end: number }[] = []
        try { breaks = JSON.parse(schedule.breakWindows || '[]').map((b: { start: string; end: string }) => ({ start: b.start.split(':').reduce((a: number, c: string, i: number) => i === 0 ? Number(c) * 60 : a + Number(c), 0), end: b.end.split(':').reduce((a: number, c: string, i: number) => i === 0 ? Number(c) * 60 : a + Number(c), 0) })) } catch { /* ignore */ }

        let token = 1
        while (cursor + duration <= endMin) {
          const inBreak = breaks.some((b) => cursor >= b.start && cursor < b.end)
          if (!inBreak) {
            await db.slot.create({
              data: {
                doctorId: doc.id,
                clinicId: clinic.id,
                date: dateOnly,
                startTime: `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`,
                endTime: `${String(Math.floor((cursor + duration) / 60)).padStart(2, '0')}:${String((cursor + duration) % 60).padStart(2, '0')}`,
                tokenNo: doc.queueMode === 'time' ? null : token,
                status: 'open',
              },
            })
            token++
          }
          cursor += duration
        }
      }
    }

    // Book ~25 appointments per clinic spread across June 12-28 with varied statuses
    const apptStatuses = ['completed', 'completed', 'completed', 'completed', 'booked', 'booked', 'booked', 'cancelled', 'no_show', 'late_no_show', 'completed', 'booked', 'completed']
    for (let i = 0; i < 25; i++) {
      const day = 12 + (i % 17) // 12-28
      const doc = clinicDoctors[i % clinicDoctors.length]
      const patient = clinicPatients[i % clinicPatients.length]
      const service = clinicServices[i % clinicServices.length]
      const hour = 9 + (i % 8)
      const start = pkDate(day, hour, (i % 4) * 15)
      const end = new Date(start.getTime() + doc.slotDurationMin * 60 * 1000)
      const status = apptStatuses[i % apptStatuses.length]
      const channel = ['whatsapp', 'manual', 'link', 'platform'][i % 4]
      const paymentMode = i % 3 === 0 ? 'online' : 'cash'
      const paymentStatus = status === 'completed' ? 'paid' : status === 'cancelled' ? 'refunded' : status === 'no_show' ? 'pending' : 'pending'

      const doctorFee = service.baseFee
      const clinicMarkup = 0
      const platformFee = 50
      const total = doctorFee + clinicMarkup + platformFee

      const appt = await db.appointment.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          doctorId: doc.id,
          serviceId: service.id,
          start,
          end,
          status: status as AppointmentStatus,
          channel,
          doctorFee,
          platformFee,
          totalFee: total,
          paymentStatus,
          paymentMode,
          createdVia: channel === 'whatsapp' ? 'agent' : channel,
          checkInTime: status === 'completed' ? new Date(start.getTime() + 2 * 60 * 1000) : null,
          notes: i % 5 === 0 ? 'Follow-up required' : null,
        },
      })

      await db.appointmentFees.create({
        data: {
          appointmentId: appt.id,
          baseDoctorFee: doctorFee,
          clinicMarkup,
          platformFee,
          total,
          currency: 'PKR',
        },
      })

      // Credit ledger entries for completed bookings (debit platform fee)
      if (status === 'completed' || status === 'booked') {
        const lastEntry = await db.creditLedger.findFirst({
          where: { clinicId: clinic.id },
          orderBy: { createdAt: 'desc' },
        })
        const balanceAfter = (lastEntry?.balanceAfter ?? clinic.creditBalance) - platformFee
        await db.creditLedger.create({
          data: {
            clinicId: clinic.id,
            type: 'debit',
            amount: platformFee,
            reason: 'appointment_fee',
            appointmentId: appt.id,
            balanceAfter,
          },
        })
      }
    }
  }

  // ========================================================================
  // 7. CONVERSATIONS + MESSAGES (sample WhatsApp transcripts)
  // ========================================================================
  console.log('💬 Creating conversations + messages...')
  const sampleConversations = [
    {
      msgs: [
        { dir: 'in', body: 'Asalamualaikum, appointment lena hai' },
        { dir: 'out', body: 'Walaikum assalam! Ahmed bhai, aap ka shukriya. Kis doctor ke saath appointment chahiye?' },
        { dir: 'in', body: 'Dr. Ahmed General ke saath' },
        { dir: 'out', body: 'Bilkul. Kal 10:30 AM, 11:00 AM, ya 11:30 AM — konsa slot theek rahega?' },
        { dir: 'in', body: '10:30 wala' },
        { dir: 'out', body: 'Theek hai, aap ki appointment confirm ho gayi. Token 4, ~10:30 AM. Fees: PKR 1250 (doctor fee 1200 + platform fee 50). Clinic me dena hoga.' },
        { dir: 'in', body: 'Shukriya' },
        { dir: 'out', body: 'Aap ka khush aamdeed. Allah hafiz!' },
      ],
    },
    {
      msgs: [
        { dir: 'in', body: 'Main apni maa Salma ke liye appointment lena chahta hoon' },
        { dir: 'out', body: 'Bilkul. Salma begum ke liye Dr. Salma Skin ke saath Tuesday 2:00 PM theek rahega?' },
        { dir: 'in', body: 'Haan' },
        { dir: 'out', body: 'Confirm. Token 8. Fees PKR 1850. Salma begum ke blood pressure ki history hai, doctor ko batayein.' },
      ],
    },
    {
      msgs: [
        { dir: 'in', body: 'Abhi kya situation hai?' },
        { dir: 'out', body: 'Abhi token 6 chal raha hai, aap token 9 hain — taqreeban 25 minute lagain gay. Doctor sahab clinic me hain.' },
        { dir: 'in', body: 'Theek hai, aa rahe hain' },
      ],
    },
    {
      msgs: [
        { dir: 'in', body: 'Meri appointment cancel karni hai' },
        { dir: 'out', body: 'Aap ki kal 4:00 PM ki appointment cancel kar di gayi. Koi masla nahi, reschedule karna ho to bata dein.' },
      ],
    },
    {
      msgs: [
        { dir: 'in', body: 'Voice note', type: 'voice' },
        { dir: 'out', body: 'Aap ka voice note mil gaya. Aap ne kaha ke appointment leni hai — kis doctor ke saath?', transcript: 'Maine kaha hai ke appointment leni hai' },
      ],
    },
  ]

  for (const clinic of clinics) {
    const clinicPatients = patients.filter((p) => p.clinicId === clinic.id)
    for (let i = 0; i < 6; i++) {
      const patient = clinicPatients[i % clinicPatients.length]
      const convo = sampleConversations[i % sampleConversations.length]
      const start = pkDate(12 + i * 2, 10 + i)
      const conv = await db.conversation.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          channel: 'evo',
          status: i % 4 === 0 ? 'closed' : 'active',
          lastIntent: i === 0 ? 'book' : i === 1 ? 'book_family' : i === 2 ? 'live_status' : i === 3 ? 'cancel' : 'voice',
          summary: convo.msgs.map((m) => `${m.dir === 'in' ? 'P' : 'A'}: ${m.body}`).join(' | ').slice(0, 200),
          agentPersonaSnapshot: JSON.stringify({ name: clinic.agentName, gender: clinic.agentGender, tone: clinic.agentTone }),
          tags: JSON.stringify(i % 3 === 0 ? ['VIP'] : []),
          createdAt: start,
          updatedAt: new Date(start.getTime() + convo.msgs.length * 60 * 1000),
        },
      })
      for (const [mi, m] of convo.msgs.entries()) {
        await db.message.create({
          data: {
            conversationId: conv.id,
            direction: m.dir as MessageDirection,
            type: ((m as { type?: string }).type || 'text') as MessageType,
            body: m.body,
            transcript: (m as { transcript?: string }).transcript,
            agentGenderUsed: m.dir === 'out' ? clinic.agentGender : null,
            agentLanguageUsed: m.dir === 'out' ? 'urdu' : null,
            ts: new Date(start.getTime() + mi * 60 * 1000),
          },
        })
      }
    }
  }

  // ========================================================================
  // 8. PAYMENT PROOFS (mixed pending + confirmed + rejected)
  // ========================================================================
  console.log('💰 Creating payment proofs + top-up credits...')
  for (const [ci, clinic] of clinics.entries()) {
    // 2 pending patient payments
    const clinicPatients = patients.filter((p) => p.clinicId === clinic.id)
    for (let i = 0; i < 2; i++) {
      const patient = clinicPatients[i]
      await db.paymentProof.create({
        data: {
          clinicId: clinic.id,
          ledgerType: 'patient_payment',
          amount: 1250 + i * 600,
          payerName: patient.name || 'Unknown',
          payerPhone: patient.phone,
          screenshotUrl: `/uploads/proof-sample-${ci}-${i}.png`,
          uploadedBy: 'patient',
          status: 'pending',
          notes: 'WhatsApp se bheji',
        },
      })
    }

    // 1 confirmed clinic top-up
    const lastEntry = await db.creditLedger.findFirst({
      where: { clinicId: clinic.id },
      orderBy: { createdAt: 'desc' },
    })
    const before = lastEntry?.balanceAfter ?? clinic.creditBalance
    const topupAmount = 5000
    const proof = await db.paymentProof.create({
      data: {
        clinicId: clinic.id,
        ledgerType: 'clinic_topup',
        amount: topupAmount,
        payerName: clinic.name,
        screenshotUrl: `/uploads/topup-${ci}.png`,
        uploadedBy: 'admin',
        status: 'confirmed',
        confirmedBy: financeStaff.id,
        confirmedAt: pkDate(13, 11),
      },
    })
    await db.creditLedger.create({
      data: {
        clinicId: clinic.id,
        type: 'credit',
        amount: topupAmount,
        reason: 'topup',
        paymentProofId: proof.id,
        balanceAfter: before + topupAmount,
      },
    })

    // 1 rejected proof
    await db.paymentProof.create({
      data: {
        clinicId: clinic.id,
        ledgerType: 'patient_payment',
        amount: 999,
        payerName: 'Wrong Screenshot',
        screenshotUrl: `/uploads/wrong-${ci}.png`,
        uploadedBy: 'patient',
        status: 'rejected',
        confirmedBy: financeStaff.id,
        confirmedAt: pkDate(14, 12),
        notes: 'Amount mismatch — fees PKR 1500 thi, screenshot PKR 999 ka',
      },
    })
  }

  // ========================================================================
  // 9. LEADS (from landing page)
  // ========================================================================
  console.log('📢 Creating leads...')
  const leadCities = ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan']
  for (let i = 0; i < 6; i++) {
    await db.lead.create({
      data: {
        clinicName: `${['Shifa', 'Noor', 'Rehman', 'Al-Medico', 'City Health', 'Green Cross'][i]} Clinic`,
        adminName: `${['Tariq', 'Sadia', 'Faisal', 'Nida', 'Bilal', 'Rabia'][i]} Khan`,
        whatsappNumber: `+9230012345${80 + i}`,
        city: leadCities[i],
        monthlyAppointments: 200 + i * 50,
        status: i < 2 ? 'new' : i < 4 ? 'contacted' : 'demo_booked',
        claimedByStaffId: i >= 2 ? salesStaff.id : null,
        notes: i === 5 ? 'Premium prospect — 3 doctors' : null,
      },
    })
  }

  // ========================================================================
  // 10. PLATFORM APPOINTMENTS (sales demos, onboarding, support)
  // ========================================================================
  console.log('📆 Creating platform appointments...')
  for (let i = 0; i < 8; i++) {
    const day = 12 + i * 2
    const start = pkDate(day, 11 + (i % 3))
    await db.platformAppointment.create({
      data: {
        staffId: [salesStaff.id, onboardingStaff.id, supportStaff.id, financeStaff.id][i % 4],
        adminId: admin.id,
        clinicId: clinics[i % clinics.length].id,
        purpose: ['sales', 'onboarding', 'support', 'demo'][i % 4],
        start,
        end: new Date(start.getTime() + 30 * 60 * 1000),
        status: day < 20 ? 'completed' : 'scheduled',
        location: 'online',
        meetLink: `https://meet.clinicsai.pk/demo-${i}`,
        notes: `Session ${i + 1} — ${['Demo of platform', 'QR scan + doctor setup', 'Bug in slot engine', 'Invoice review'][i % 4]}`,
      },
    })
  }

  // ========================================================================
  // 11. NOTIFICATION TEMPLATES
  // ========================================================================
  console.log('📨 Creating notification templates...')
  const templates = [
    { trigger: 'booking_confirm', body: 'Aap ki appointment confirm hai: {date} {time}, {doctor}. Token: {token}. Fees: PKR {fee}. Clinic: {clinic_name}' },
    { trigger: 'reminder_24h', body: 'Reminder: kal {time} par aap ki appointment hai {doctor} ke saath. Token {token}.' },
    { trigger: 'reminder_2h', body: 'Aap ki appointment 2 ghante baad hai. {clinic_name} me pohanch jaayein. Token {token}.' },
    { trigger: 'reminder_30min', body: 'Aap ki baari 30 min me! Abhi clinic pohanch jaayein.' },
    { trigger: 'cancel', body: 'Aap ki appointment cancel ho gayi. Reschedule karna ho to bata dein.' },
    { trigger: 'no_show_followup', body: 'Aaj aap nahi aa sake. Umeed hai sab theek hai. Reschedule karna ho to bata dein.' },
    { trigger: 'payment_confirm', body: 'Aap ki payment PKR {amount} confirm ho gayi. Shukriya!' },
  ]
  for (const clinic of clinics) {
    for (const t of templates) {
      await db.notificationTemplate.create({
        data: {
          clinicId: clinic.id,
          channel: 'whatsapp',
          triggerEvent: t.trigger,
          bodyTemplate: t.body,
          language: 'urdu',
          modality: 'text',
          enabled: true,
        },
      })
    }
  }

  // ========================================================================
  // 12. ANALYTICS SNAPSHOTS (daily rollups June 12-28)
  // ========================================================================
  console.log('📊 Creating analytics snapshots...')
  for (const clinic of clinics) {
    for (let day = 12; day <= 28; day++) {
      const date = new Date(Date.UTC(2026, 5, day))
      const appts = await db.appointment.findMany({
        where: {
          clinicId: clinic.id,
          start: { gte: new Date(Date.UTC(2026, 5, day, 0, 0, 0)), lt: new Date(Date.UTC(2026, 5, day + 1, 0, 0, 0)) },
        },
      })
      const completed = appts.filter((a) => a.status === 'completed').length
      const noShow = appts.filter((a) => a.status === 'no_show').length
      const revenue = appts.filter((a) => a.status === 'completed').reduce((s, a) => s + a.totalFee, 0)
      const onlinePaid = appts.filter((a) => a.paymentMode === 'online' && a.paymentStatus === 'paid').length
      await db.analyticsSnapshot.create({
        data: {
          clinicId: clinic.id,
          date,
          metrics: JSON.stringify({
            appointments: appts.length,
            completed,
            no_show: noShow,
            no_show_rate: appts.length ? (noShow / appts.length) * 100 : 0,
            revenue,
            online_paid: onlinePaid,
            cash_paid: completed - onlinePaid,
          }),
        },
      })
    }
  }

  // ========================================================================
  // 13. INVOICES (June 2026 monthly for each clinic)
  // ========================================================================
  console.log('🧾 Creating invoices...')
  for (const clinic of clinics) {
    const juneAppts = await db.appointment.findMany({
      where: {
        clinicId: clinic.id,
        start: { gte: new Date(Date.UTC(2026, 5, 1)), lt: new Date(Date.UTC(2026, 6, 1)) },
        status: { in: ['completed', 'booked'] },
      },
    })
    const platformTotal = juneAppts.reduce((s, a) => s + a.platformFee, 0)
    const extraTotal = juneAppts.reduce((s, a) => s + a.clinicMarkup, 0)
    await db.invoice.create({
      data: {
        clinicId: clinic.id,
        periodStart: new Date(Date.UTC(2026, 5, 1)),
        periodEnd: new Date(Date.UTC(2026, 5, 30)),
        totalAppointments: juneAppts.length,
        platformFeeTotal: platformTotal,
        clinicMarkupTotal: extraTotal,
        metaCostTotal: 0,
        status: 'sent',
      },
    })
  }

  // ========================================================================
  // 14. FILTERED MESSAGE LOGS (sample — group/status/broadcast filtered)
  // ========================================================================
  console.log('🔇 Creating filtered message logs...')
  for (const clinic of clinics) {
    for (const reason of ['group', 'status', 'broadcast']) {
      await db.filteredMessageLog.create({
        data: {
          clinicId: clinic.id,
          reason,
          raw: `Sample ${reason} message filtered out per Evolution API policy`,
        },
      })
    }
  }

  // ========================================================================
  // 15. AUDIT LOGS
  // ========================================================================
  console.log('📝 Creating audit logs...')
  await db.auditLog.create({
    data: {
      actorId: admin.id,
      actorType: 'platform_admin',
      action: 'login',
      target: 'platform',
      metadata: JSON.stringify({ ip: '127.0.0.1' }),
    },
  })
  for (const clinic of clinics) {
    const cadmin = clinicAdmins.find((c) => c.clinicId === clinic.id)
    if (cadmin) {
      await db.auditLog.create({
        data: {
          actorId: cadmin.id,
          actorType: 'clinic_admin',
          clinicId: clinic.id,
          action: 'agent_toggled',
          target: `clinic:${clinic.id}:agent`,
          metadata: JSON.stringify({ enabled: clinic.agentEnabled }),
        },
      })
    }
  }

  console.log('\n✅ Seed complete!')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🔐 LOGIN CREDENTIALS (password for all: ClinicAI@2026)')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('Platform Admin:    admin@clinicsai.pk')
  console.log('Platform Sales:    sales@clinicsai.pk')
  console.log('Platform Onboard:  onboarding@clinicsai.pk')
  console.log('Platform Support:  support@clinicsai.pk')
  console.log('Platform Finance:  finance@clinicsai.pk')
  console.log('Al-Shifa Admin:    admin@al-shifa.pk')
  console.log('Al-Shifa Reception: reception@al-shifa.pk')
  console.log('Al-Shifa Doctor:   doctor0@al-shifa.pk / doctor1@al-shifa.pk')
  console.log('Medicare Admin:    admin@medicare.pk')
  console.log('Medicare Reception: reception@medicare.pk')
  console.log('Medicare Doctor:   doctor0@medicare.pk / doctor1@medicare.pk / doctor2@medicare.pk')
  console.log('City Dental Admin: admin@city-dental.pk')
  console.log('City Dental Reception: reception@city-dental.pk')
  console.log('City Dental Doctor: doctor0@city-dental.pk / doctor1@city-dental.pk')
  console.log('═══════════════════════════════════════════════════════════')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
