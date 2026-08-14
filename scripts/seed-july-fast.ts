/**
 * ClinicAI — Fast July 2026 Batch Seeder
 * Uses raw SQL inserts for speed (10-20x faster than Prisma createMany)
 */
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function pkDate(day: number, hour: number, min = 0): Date {
  return new Date(Date.UTC(2026, 6, day, hour - 5, min, 0))
}

function hashPhone(phone: string, clinicId: string): string {
  return crypto.createHash('sha256').update(phone + clinicId).digest('hex')
}

const NAMES = [
  { name: 'Muhammad Ali', g: 'male' }, { name: 'Fatima Noor', g: 'female' }, { name: 'Ahmed Raza', g: 'male' },
  { name: 'Ayesha Khan', g: 'female' }, { name: 'Bilal Siddiqui', g: 'male' }, { name: 'Zainab Malik', g: 'female' },
  { name: 'Hassan Sheikh', g: 'male' }, { name: 'Sana Tariq', g: 'female' }, { name: 'Usman Dar', g: 'male' },
  { name: 'Nadia Hussain', g: 'female' }, { name: 'Imran Qureshi', g: 'male' }, { name: 'Rabia Javed', g: 'female' },
  { name: 'Kamran Butt', g: 'male' }, { name: 'Maryam Akram', g: 'female' }, { name: 'Farhan Shah', g: 'male' },
  { name: 'Samina Aziz', g: 'female' }, { name: 'Tariq Mehmood', g: 'male' }, { name: 'Hina Iqbal', g: 'female' },
  { name: 'Junaid Alam', g: 'male' }, { name: 'Saima Parveen', g: 'female' }, { name: 'Rashid Naeem', g: 'male' },
]

async function main() {
  console.log('Truncating...')
  await db.$executeRawUnsafe(`TRUNCATE TABLE "AppointmentFees","PaymentProof","Reminder","CreditLedger","AppointmentFeedback","Appointment","Slot","PatientFamilyMember","Patient","Conversation","Message","AnalyticsSnapshot" CASCADE`)

  const clinics = await db.clinic.findMany({ select: { id: true, name: true } })
  const allDoctors = await db.doctor.findMany({
    where: { active: true },
    include: { services: true, schedules: true },
  })

  if (allDoctors.length === 0) { console.log('No doctors'); return }

  for (const clinic of clinics) {
    const doctors = allDoctors.filter(d => d.clinicId === clinic.id)
    if (doctors.length === 0) continue
    console.log(`\n=== ${clinic.name} (${doctors.length} doctors) ===`)

    // --- Create 20 patients ---
    const startIdx = clinics.indexOf(clinic) * 20
    const patientIds: string[] = []
    for (let i = 0; i < 20; i++) {
      const p = NAMES[(startIdx + i) % NAMES.length]
      const phone = '300' + String(Math.floor(Math.random() * 9000000)).padStart(7, '0')
      const id = `pat_${clinic.id.slice(0,6)}_${i}`
      await db.$executeRawUnsafe(`
        INSERT INTO "Patient" (id, "clinicId", "phoneHash", "phoneLast4", phone, name, gender, "totalVisits", "noShowCount", "preferredLanguage", "preferredModality")
        VALUES ($1,$2,$3,$4,$5,$6,$7::"Gender",$8,$9,'urdu','auto') ON CONFLICT (id) DO NOTHING`,
        id, clinic.id, hashPhone(phone, clinic.id), phone.slice(-4), phone, p.name, p.g, Math.floor(Math.random()*8)+1, Math.random()<0.15 ? Math.floor(Math.random()*2)+1 : 0)
      patientIds.push(id)
    }
    console.log(`  20 patients created`)

    // --- Generate slots and appointments ---
    let totalAppts = 0
    let feesRows: unknown[] = []
    let remRows: unknown[] = []
    let slotUpdateIds: string[] = []
    let feedbackRows: unknown[] = []

    const statusDist: Array<{status:string,w:number}> = [{status:'completed',w:60},{status:'booked',w:15},{status:'cancelled',w:10},{status:'no_show',w:10},{status:'held',w:5}]
    const chDist: string[] = ['manual','manual','manual','manual','manual','whatsapp','whatsapp','whatsapp','link','link']
    const ratings = [3,4,4,5,5,5,4,4]

    function pickWeighted(items: Array<{status:string,w:number}>) {
      const total = items.reduce((s,i)=>s+i.w,0)
      let r = Math.random() * total
      for (const it of items) { r -= it.w; if (r <= 0) return it.status }
      return items[0].status
    }

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
          const stH = Math.floor(min / 60)
          const stM = min % 60
          const etH = Math.floor((min + duration) / 60)
          const etM = (min + duration) % 60
          const startStr = `${String(stH).padStart(2,'0')}:${String(stM).padStart(2,'0')}`
          const endStr = `${String(etH).padStart(2,'0')}:${String(etM).padStart(2,'0')}`

          const slotId = crypto.randomBytes(12).toString('hex')
          const startDate = pkDate(day, stH, stM)
          const endDate = new Date(startDate.getTime() + duration * 60 * 1000)

          // ~65% chance of booking this slot
          if (Math.random() > 0.65) {
            tokenNo++
            continue
          }

          const status = pickWeighted(statusDist)
          const channel = chDist[Math.floor(Math.random() * chDist.length)]
          const patientId = patientIds[Math.floor(Math.random() * patientIds.length)]
          const apptId = crypto.randomBytes(12).toString('hex')
          const payStatus = status === 'completed' ? 'paid' : status === 'booked' ? (Math.random() > 0.5 ? 'paid' : 'pending') : 'pending'
          const totalFee = doctorFee + extraFee + platformFee

          // Insert slot
          await db.$executeRawUnsafe(`
            INSERT INTO "Slot" (id, "doctorId", "clinicId", date, "startTime", "endTime", "durationMin", "tokenNo", status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::"SlotStatus") ON CONFLICT (id) DO NOTHING`,
            slotId, doctor.id, clinic.id, d.toISOString(), startStr, endStr, duration, tokenNo, status === 'cancelled' ? 'open' : 'booked')

          if (status === 'cancelled') { tokenNo++; continue }

          // Insert appointment
          const aptRow = { id: apptId, clinicId: clinic.id, patientId, doctorId: doctor.id, slotId, serviceId: svc?.id || null, start: startDate.toISOString(), end: endDate.toISOString(), status, channel, createdVia: channel === 'whatsapp' ? 'agent' : channel === 'link' ? 'public' : 'receptionist', doctorFee: Number(doctorFee), clinicMarkup: Number(extraFee), platformFee: Number(platformFee), totalFee: Number(totalFee), paymentStatus: payStatus, paymentMode: Math.random()>0.4?'cash':'online' }

          // Insert appointment
          await db.$executeRawUnsafe(`
            INSERT INTO "Appointment" (id, "clinicId", "patientId", "doctorId", "slotId", "serviceId", start, "end", status, channel, "createdVia", "doctorFee", "clinicMarkup", "platformFee", "totalFee", "paymentStatus", "paymentMode")
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::"AppointmentStatus",$10,$11,$12,$13,$14,$15,$16,$17::"PaymentMode") ON CONFLICT (id) DO NOTHING`,
            aptRow.id, aptRow.clinicId, aptRow.patientId, aptRow.doctorId, aptRow.slotId, aptRow.serviceId, aptRow.start, aptRow.end, aptRow.status, aptRow.channel, aptRow.createdVia, aptRow.doctorFee, aptRow.clinicMarkup, aptRow.platformFee, aptRow.totalFee, aptRow.paymentStatus, aptRow.paymentMode)

          // Fee record
          await db.$executeRawUnsafe(`
            INSERT INTO "AppointmentFees" (id, "appointmentId", "baseDoctorFee", "clinicMarkup", "platformFee", total, currency)
            VALUES ($1,$2,$3,$4,$5,$6,'PKR') ON CONFLICT (id) DO NOTHING`,
            crypto.randomBytes(12).toString('hex'), apptId, aptRow.doctorFee, aptRow.clinicMarkup, aptRow.platformFee, aptRow.totalFee)

          // Reminders for booked/held
          if (status === 'booked' || status === 'held') {
            const rTypes = [['reminder_24h',24*60*60*1000],['reminder_2h',2*60*60*1000],['reminder_30min',30*60*1000]]
            for (const [rt, rms] of rTypes) {
              await db.$executeRawUnsafe(`
                INSERT INTO "Reminder" (id, "appointmentId", type, "sendAt", status, channel)
                VALUES ($1,$2,$3,$4,'pending','whatsapp') ON CONFLICT (id) DO NOTHING`,
                crypto.randomBytes(12).toString('hex'), apptId, rt, new Date(startDate.getTime() - Number(rms)).toISOString())
            }
          }

          // Feedback for completed
          if (status === 'completed') {
            await db.$executeRawUnsafe(`
              INSERT INTO "AppointmentFeedback" (id, "appointmentId", "clinicId", "patientId", "doctorId", rating, "waitTimeMins")
              VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
              crypto.randomBytes(12).toString('hex'), apptId, clinic.id, patientId, doctor.id, ratings[Math.floor(Math.random()*ratings.length)], Math.floor(Math.random()*30)+5)
          }

          totalAppts++
          tokenNo++
        }
      }
    }
    console.log(`  ✅ ${totalAppts} appointments`)
  }

  // Update clinic credit balances
  for (const clinic of clinics) {
    const credits = Math.floor(Math.random() * 5000) + 5000
    await db.clinic.update({ where: { id: clinic.id }, data: { creditBalance: credits } })
  }

  console.log('\nSeed complete!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
