/**
 * ClinicAI — July 2026 Seed Script
 * Seed realistic appointment data for July 1–26, 2026
 * Keeps existing clinics, doctors, users. Only replaces appointments, patients, slots.
 *
 * Run: bun run scripts/seed-july-2026.ts
 */
import { PrismaClient } from '@prisma/client'
import { hashPhone } from '../src/lib/auth'
import { generateSlotsForDoctorDate } from '../src/lib/schedule'

const db = new PrismaClient()

function pkDate(day: number, hour: number, min = 0): Date {
  return new Date(Date.UTC(2026, 6, day, hour - 5, min, 0))
}

function pkTimeStr(hour: number, min = 0): string {
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

const PAKISTANI_NAMES = [
  { name: 'Muhammad Ali', gender: 'male' as const },
  { name: 'Fatima Noor', gender: 'female' as const },
  { name: 'Ahmed Raza', gender: 'male' as const },
  { name: 'Ayesha Khan', gender: 'female' as const },
  { name: 'Bilal Siddiqui', gender: 'male' as const },
  { name: 'Zainab Malik', gender: 'female' as const },
  { name: 'Hassan Sheikh', gender: 'male' as const },
  { name: 'Sana Tariq', gender: 'female' as const },
  { name: 'Usman Dar', gender: 'male' as const },
  { name: 'Nadia Hussain', gender: 'female' as const },
  { name: 'Imran Qureshi', gender: 'male' as const },
  { name: 'Rabia Javed', gender: 'female' as const },
  { name: 'Kamran Butt', gender: 'male' as const },
  { name: 'Maryam Akram', gender: 'female' as const },
  { name: 'Farhan Shah', gender: 'male' as const },
  { name: 'Samina Aziz', gender: 'female' as const },
  { name: 'Tariq Mehmood', gender: 'male' as const },
  { name: 'Hina Iqbal', gender: 'female' as const },
  { name: 'Junaid Alam', gender: 'male' as const },
  { name: 'Saima Parveen', gender: 'female' as const },
  { name: 'Rashid Naeem', gender: 'male' as const },
  { name: 'Amna Saeed', gender: 'female' as const },
  { name: 'Faisal Tanveer', gender: 'male' as const },
  { name: 'Kiran Zaidi', gender: 'female' as const },
  { name: 'Zubair Gondal', gender: 'male' as const },
  { name: 'Sidra Nasir', gender: 'female' as const },
  { name: 'Adeel Anwar', gender: 'male' as const },
  { name: 'Fariha Latif', gender: 'female' as const },
  { name: 'Noman Aslam', gender: 'male' as const },
  { name: 'Lubna Riaz', gender: 'female' as const },
  { name: 'Shahid Yousaf', gender: 'male' as const },
  { name: 'Uzma Haider', gender: 'female' as const },
  { name: 'Waqar Sohail', gender: 'male' as const },
  { name: 'Tahira Bhatti', gender: 'female' as const },
  { name: 'Salman Farooq', gender: 'male' as const },
  { name: 'Mehwish Sultan', gender: 'female' as const },
  { name: 'Adnan Chughtai', gender: 'male' as const },
  { name: 'Sadia Gul', gender: 'female' as const },
  { name: 'Gohar Ayub', gender: 'male' as const },
  { name: 'Rizwana Kausar', gender: 'female' as const },
  { name: 'Omar Sharif', gender: 'male' as const },
  { name: 'Nasreen Akhtar', gender: 'female' as const },
  { name: 'Danish Khalid', gender: 'male' as const },
  { name: 'Anila Rafiq', gender: 'female' as const },
  { name: 'Arif Mehmood', gender: 'male' as const },
  { name: 'Bushra Jahan', gender: 'female' as const },
  { name: 'Irfan Haq', gender: 'male' as const },
  { name: 'Ghazala Naaz', gender: 'female' as const },
  { name: 'Qasim Lodhi', gender: 'male' as const },
  { name: 'Rukhsana Bibi', gender: 'female' as const },
  { name: 'Naveed Tariq', gender: 'male' as const },
  { name: 'Shabana Ahmed', gender: 'female' as const },
  { name: 'Zahid Mughal', gender: 'male' as const },
  { name: 'Farzana Komal', gender: 'female' as const },
  { name: 'Abid Cheema', gender: 'male' as const },
  { name: 'Nosheen Mir', gender: 'female' as const },
  { name: 'Tahir Awan', gender: 'male' as const },
  { name: 'Almas Pervez', gender: 'female' as const },
  { name: 'Nadeem Sial', gender: 'male' as const },
  { name: 'Parveen Akram', gender: 'female' as const },
]

const STATUS_DISTRIBUTION: Array<{ status: string; weight: number }> = [
  { status: 'completed', weight: 60 },
  { status: 'booked', weight: 15 },
  { status: 'cancelled', weight: 10 },
  { status: 'no_show', weight: 10 },
  { status: 'held', weight: 5 },
]

const CHANNEL_DISTRIBUTION: Array<{ channel: string; weight: number }> = [
  { channel: 'manual', weight: 50 },
  { channel: 'whatsapp', weight: 30 },
  { channel: 'link', weight: 20 },
]

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[0]
}

function randomPhone(): string {
  const prefix = ['300', '301', '302', '303', '304', '305', '306', '307', '308', '309', '321', '322', '331', '332', '333', '334', '345', '346', '347']
  const prefix3 = prefix[Math.floor(Math.random() * prefix.length)]
  const rest = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  return prefix3 + rest
}

async function main() {
  console.log('🧹 Truncating appointment-related data...')
  await db.appointmentFees.deleteMany()
  await db.paymentProof.deleteMany()
  await db.reminder.deleteMany()
  await db.creditLedger.deleteMany({ where: { reason: { in: ['appointment_fee', 'refund'] } } })
  await db.appointmentFeedback.deleteMany()
  await db.appointment.deleteMany()
  await db.conversation.deleteMany()
  await db.message.deleteMany()
  await db.slot.deleteMany()
  await db.patientFamilyMember.deleteMany()
  await db.patient.deleteMany()
  await db.analyticsSnapshot.deleteMany()

  console.log('🏥 Fetching clinics...')
  const clinics = await db.clinic.findMany({ select: { id: true, name: true } })
  if (clinics.length === 0) {
    console.log('❌ No clinics found. Run prisma db:seed first.')
    return
  }

  for (const clinic of clinics) {
    console.log(`\n=== ${clinic.name} ===`)

    const doctors = await db.doctor.findMany({
      where: { clinicId: clinic.id, active: true },
      include: { services: true },
    })

    if (doctors.length === 0) {
      console.log(`  ⚠ No doctors for ${clinic.name}, skipping`)
      continue
    }

    // Create 20 patients per clinic
    console.log('  👥 Creating 20 patients...')
    const patients = []
    const startIdx = clinics.indexOf(clinic) * 20
    for (let i = 0; i < 20; i++) {
      const person = PAKISTANI_NAMES[(startIdx + i) % PAKISTANI_NAMES.length]
      const phone = randomPhone()
      const totalVisits = Math.floor(Math.random() * 8) + 1
      const noShowCount = Math.random() < 0.15 ? Math.floor(Math.random() * 2) + 1 : 0
      const patient = await db.patient.create({
        data: {
          clinicId: clinic.id,
          phoneHash: hashPhone(phone + clinic.id),
          phoneLast4: phone.slice(-4),
          phone,
          name: person.name,
          gender: person.gender,
          totalVisits,
          noShowCount,
          preferredLanguage: 'urdu',
          preferredModality: 'auto',
        },
      })
      patients.push(patient)
    }

    // Generate slots for all 26 days
    console.log('  📅 Generating slots for July 1-26...')
    for (const doctor of doctors) {
      for (let day = 1; day <= 26; day++) {
        const date = new Date(Date.UTC(2026, 6, day))
        await generateSlotsForDoctorDate(doctor.id, date)
      }
    }

    // Create appointments
    console.log('  📋 Creating appointments...')
    let apptCount = 0
    const target = Math.floor(140 + Math.random() * 30) // 140-170 per clinic

    for (const doctor of doctors) {
      const docSlots = await db.slot.findMany({
        where: { doctorId: doctor.id, clinicId: clinic.id, status: 'open' },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      })

      for (const slot of docSlots) {
        // ~70% probability of this slot getting an appointment
        if (Math.random() > 0.7) continue
        if (apptCount >= target) break

        const patient = patients[Math.floor(Math.random() * patients.length)]
        const statusItem = weightedRandom(STATUS_DISTRIBUTION)
        const channelItem = weightedRandom(CHANNEL_DISTRIBUTION)
        const service = doctor.services[0] || null

        const [sh, sm] = slot.startTime.split(':').map(Number)
        const start = new Date(slot.date.getTime() + (sh * 60 + sm) * 60 * 1000 - 5 * 60 * 60 * 1000)
        const duration = slot.durationMin || doctor.slotDurationMin || 15
        const end = new Date(start.getTime() + duration * 60 * 1000)

        const doctorFee = service?.baseFee || 800
        const extraFee = service?.clinicMarkup || 100
        const platformFee = 50
        const totalFee = doctorFee + extraFee + platformFee

        const appointment = await db.appointment.create({
          data: {
            clinicId: clinic.id,
            patientId: patient.id,
            doctorId: doctor.id,
            slotId: slot.id,
            serviceId: service?.id || null,
            start,
            end,
            status: statusItem.status as string,
            channel: channelItem.channel,
            createdVia: channelItem.channel === 'whatsapp' ? 'agent' : channelItem.channel === 'link' ? 'public' : 'receptionist',
            doctorFee,
            clinicMarkup: extraFee,
            platformFee,
            totalFee,
            paymentStatus: statusItem.status === 'completed' ? 'paid' : statusItem.status === 'booked' ? (Math.random() > 0.5 ? 'paid' : 'pending') : 'pending',
            paymentMode: Math.random() > 0.4 ? 'cash' : 'online',
          },
        })

        await db.appointmentFees.create({
          data: {
            appointmentId: appointment.id,
            baseDoctorFee: doctorFee,
            clinicMarkup: extraFee,
            platformFee,
            total: totalFee,
            currency: 'PKR',
          },
        })

        // Only create reminders for booked/held appointments
        if (statusItem.status === 'booked' || statusItem.status === 'held') {
          const offsets = [
            { type: 'reminder_24h' as const, ms: 24 * 60 * 60 * 1000 },
            { type: 'reminder_2h' as const, ms: 2 * 60 * 60 * 1000 },
            { type: 'reminder_30min' as const, ms: 30 * 60 * 1000 },
          ]
          for (const o of offsets) {
            await db.reminder.create({
              data: {
                appointmentId: appointment.id,
                type: o.type,
                sendAt: new Date(start.getTime() - o.ms),
                status: 'pending',
                channel: 'whatsapp',
              },
            })
          }
        }

        // Debit credit if payment is pending/paid
        if (statusItem.status === 'booked' || statusItem.status === 'completed') {
          const lastEntry = await db.creditLedger.findFirst({
            where: { clinicId: clinic.id },
            orderBy: { createdAt: 'desc' },
          })
          const balanceAfter = (lastEntry?.balanceAfter ?? 0) - platformFee
          await db.creditLedger.create({
            data: {
              clinicId: clinic.id,
              type: 'debit',
              amount: platformFee,
              reason: 'appointment_fee',
              appointmentId: appointment.id,
              balanceAfter,
            },
          })
          await db.clinic.update({
            where: { id: clinic.id },
            data: { creditBalance: balanceAfter },
          })
        }

        // Generate feedback for completed appointments
        if (statusItem.status === 'completed') {
          const ratings = [3, 4, 4, 5, 5, 5, 4, 4]
          await db.appointmentFeedback.create({
            data: {
              appointmentId: appointment.id,
              clinicId: clinic.id,
              patientId: patient.id,
              doctorId: doctor.id,
              rating: ratings[Math.floor(Math.random() * ratings.length)],
              waitTimeMins: Math.floor(Math.random() * 30) + 5,
              comment: null,
            },
          })
        }

        // Update slot status
        if (statusItem.status === 'held' || statusItem.status === 'booked' || statusItem.status === 'completed' || statusItem.status === 'no_show') {
          await db.slot.update({
            where: { id: slot.id },
            data: { status: 'booked' },
          })
        }

        apptCount++
      }
      if (apptCount >= target) break
    }
    console.log(`  ✅ Created ${apptCount} appointments`)
  }

  console.log('\n✨ Seed complete! July 1-26, 2026 data is ready.')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
