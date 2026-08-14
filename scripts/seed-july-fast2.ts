/**
 * ClinicAI — Fast July 2026 Seeder
 * Mix of raw SQL and Prisma — fastest approach
 */
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function hashPhone(phone: string, clinicId: string): string {
  return crypto.createHash('sha256').update(phone + clinicId).digest('hex')
}

const NAMES = [
  { name: 'Muhammad Ali', g: 'male' as const }, { name: 'Fatima Noor', g: 'female' as const }, { name: 'Ahmed Raza', g: 'male' as const },
  { name: 'Ayesha Khan', g: 'female' as const }, { name: 'Bilal Siddiqui', g: 'male' as const }, { name: 'Zainab Malik', g: 'female' as const },
  { name: 'Hassan Sheikh', g: 'male' as const }, { name: 'Sana Tariq', g: 'female' as const }, { name: 'Usman Dar', g: 'male' as const },
  { name: 'Nadia Hussain', g: 'female' as const }, { name: 'Imran Qureshi', g: 'male' as const }, { name: 'Rabia Javed', g: 'female' as const },
  { name: 'Kamran Butt', g: 'male' as const }, { name: 'Maryam Akram', g: 'female' as const }, { name: 'Farhan Shah', g: 'male' as const },
  { name: 'Samina Aziz', g: 'female' as const }, { name: 'Tariq Mehmood', g: 'male' as const }, { name: 'Hina Iqbal', g: 'female' as const },
  { name: 'Junaid Alam', g: 'male' as const }, { name: 'Saima Parveen', g: 'female' as const }, { name: 'Rashid Naeem', g: 'male' as const },
]

const STATUSES: Array<'completed'|'booked'|'cancelled'|'no_show'|'held'> = ['completed','booked','cancelled','no_show','held']
const STATUS_WEIGHTS = [60, 15, 10, 10, 5]
const CHANNELS = ['manual','manual','manual','manual','manual','whatsapp','whatsapp','whatsapp','link','link']
const RATINGS = [3,4,4,5,5,5,4,4]

function pickWeighted(): string {
  const total = STATUS_WEIGHTS.reduce((s,i)=>s+i,0)
  let r = Math.random() * total
  for (let i = 0; i < STATUSES.length; i++) { r -= STATUS_WEIGHTS[i]; if (r <= 0) return STATUSES[i] }
  return STATUSES[0]
}

async function main() {
  console.log('Truncating...')
  await db.appointmentFees.deleteMany()
  await db.paymentProof.deleteMany()
  await db.reminder.deleteMany()
  await db.appointmentFeedback.deleteMany()
  await db.appointment.deleteMany()
  await db.conversation.deleteMany()
  await db.message.deleteMany()
  await db.slot.deleteMany()
  await db.patientFamilyMember.deleteMany()
  await db.patient.deleteMany()
  await db.analyticsSnapshot.deleteMany()

  const clinics = await db.clinic.findMany()
  const allDoctors = await db.doctor.findMany({ where: { active: true }, include: { services: true, schedules: true } })

  if (allDoctors.length === 0) { console.log('No doctors'); return }

  for (const clinic of clinics) {
    const doctors = allDoctors.filter(d => d.clinicId === clinic.id)
    if (doctors.length === 0) continue
    console.log(`\n=== ${clinic.name} ===`)

    // Create 20 patients
    const startIdx = clinics.indexOf(clinic) * 20
    const patients: Array<{ id: string }> = []
    for (let i = 0; i < 20; i++) {
      const p = NAMES[(startIdx + i) % NAMES.length]
      const phone = '300' + String(Math.floor(Math.random() * 9000000)).padStart(7, '0')
      const pt = await db.patient.create({
        data: {
          clinicId: clinic.id, phoneHash: hashPhone(phone, clinic.id), phoneLast4: phone.slice(-4),
          phone, name: p.name, gender: p.g, totalVisits: Math.floor(Math.random()*8)+1,
          noShowCount: Math.random()<0.15 ? Math.floor(Math.random()*2)+1 : 0,
          preferredLanguage: 'urdu', preferredModality: 'auto',
        },
      })
      patients.push({ id: pt.id })
    }
    console.log(`  20 patients`)

    let totalAppts = 0
    const slotBatch: Array<Record<string, unknown>> = []
    const apptBatch: Array<Record<string, unknown>> = []
    const feeBatch: Array<Record<string, unknown>> = []
    const reminderBatch: Array<Record<string, unknown>> = []
    const feedbackBatch: Array<Record<string, unknown>> = []

    for (const doctor of doctors) {
      const duration = doctor.slotDurationMin || 15
      const svc = doctor.services[0]
      const doctorFee = svc?.baseFee || 800
      const extraFee = 100
      const platformFee = 50

      for (let day = 1; day <= 26; day++) {
        const d = new Date(Date.UTC(2026, 6, day))
        const dow = d.getUTCDay()
        const schedule = doctor.schedules.find(s => s.dayOfWeek === dow)
        if (!schedule) continue

        const [sH, sM] = schedule.startTime.split(':').map(Number)
        const [eH, eM] = schedule.endTime.split(':').map(Number)
        const startMin = sH * 60 + sM
        const endMin = eH * 60 + eM
        let tokenNo = 1

        for (let min = startMin; min + duration <= endMin; min += duration) {
          if (Math.random() > 0.65) { tokenNo++; continue }

          const stH = Math.floor(min / 60), stM = min % 60, etH = Math.floor((min + duration) / 60), etM = (min + duration) % 60
          const startStr = `${String(stH).padStart(2,'0')}:${String(stM).padStart(2,'0')}`
          const endStr = `${String(etH).padStart(2,'0')}:${String(etM).padStart(2,'0')}`

          const status = pickWeighted() as 'completed'|'booked'|'cancelled'|'no_show'|'held'
          const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)]
          const patient = patients[Math.floor(Math.random() * patients.length)]
          const slotId = crypto.randomBytes(12).toString('hex')
          const apptId = crypto.randomBytes(12).toString('hex')

          const startDate = new Date(Date.UTC(2026, 6, day, stH - 5, stM, 0))
          const endDate = new Date(startDate.getTime() + duration * 60 * 1000)
          const payMode = Math.random() > 0.4 ? 'cash' : 'online'
          const totalFee = doctorFee + extraFee + platformFee

          slotBatch.push({
            id: slotId, doctorId: doctor.id, clinicId: clinic.id, date: d,
            startTime: startStr, endTime: endStr, durationMin: duration, tokenNo,
            status: status === 'cancelled' ? 'open' : 'booked',
          })

          if (status !== 'cancelled') {
            apptBatch.push({
              id: apptId, clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id,
              slotId, serviceId: svc?.id || null, start: startDate, end: endDate,
              status, channel, createdVia: channel === 'whatsapp' ? 'agent' : channel === 'link' ? 'public' : 'receptionist',
              doctorFee, clinicMarkup: extraFee, platformFee, totalFee,
              paymentStatus: status === 'completed' ? 'paid' : status === 'booked' ? (Math.random() > 0.5 ? 'paid' : 'pending') : 'pending',
              paymentMode: payMode,
            })

            feeBatch.push({
              id: crypto.randomBytes(12).toString('hex'), appointmentId: apptId,
              baseDoctorFee: doctorFee, clinicMarkup: extraFee, platformFee, total: totalFee, currency: 'PKR',
            })

            if (status === 'booked' || status === 'held') {
              const offsets = [{ type: 'reminder_24h' as const, ms: 24*60*60*1000 },{ type: 'reminder_2h' as const, ms: 2*60*60*1000 },{ type: 'reminder_30min' as const, ms: 30*60*1000 }]
              for (const o of offsets) {
                reminderBatch.push({
                  id: crypto.randomBytes(12).toString('hex'), appointmentId: apptId, type: o.type,
                  sendAt: new Date(startDate.getTime() - o.ms), status: 'pending', channel: 'whatsapp',
                })
              }
            }

            if (status === 'completed') {
              feedbackBatch.push({
                id: crypto.randomBytes(12).toString('hex'), appointmentId: apptId,
                clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id,
                rating: RATINGS[Math.floor(Math.random() * RATINGS.length)],
                waitTimeMins: Math.floor(Math.random() * 30) + 5,
              })
            }
          }

          totalAppts++
          tokenNo++
        }
      }
    }

    // Batch insert all
    if (slotBatch.length > 0) await db.slot.createMany({ data: slotBatch as never[] })
    if (apptBatch.length > 0) await db.appointment.createMany({ data: apptBatch as never[] })
    if (feeBatch.length > 0) await db.appointmentFees.createMany({ data: feeBatch as never[] })
    if (reminderBatch.length > 0) await db.reminder.createMany({ data: reminderBatch as never[] })
    if (feedbackBatch.length > 0) await db.appointmentFeedback.createMany({ data: feedbackBatch as never[] })

    // Update clinic credit
    await db.clinic.update({ where: { id: clinic.id }, data: { creditBalance: Math.floor(Math.random() * 5000) + 5000 } })

    console.log(`  ✅ ${totalAppts} appts (${slotBatch.length} slots, ${apptBatch.length} appts, ${feeBatch.length} fees, ${reminderBatch.length} reminders, ${feedbackBatch.length} feedback)`)
  }

  const a = await db.appointment.count()
  const p = await db.patient.count()
  const s = await db.slot.count()
  console.log(`\n✨ Done! Appointments: ${a}, Patients: ${p}, Slots: ${s}`)
}

main().catch(console.error).finally(() => db.$disconnect())
