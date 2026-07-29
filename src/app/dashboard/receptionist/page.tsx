import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { ReceptionistDashboard } from './receptionist-dashboard'

export const metadata = { title: 'Receptionist Dashboard — ClinicAI' }

export default async function ReceptionistDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'receptionist') {
    if (session.type === 'clinic_admin') redirect('/dashboard/clinic')
    if (session.type === 'doctor') redirect('/dashboard/doctor')
    redirect('/dashboard')
  }

  const clinicId = session.clinicId
  const [clinic, doctors, pendingProofs] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.doctor.findMany({ where: { clinicId, active: true }, orderBy: { name: 'asc' } }),
    db.paymentProof.count({ where: { clinicId, status: 'pending' } }),
  ])
  if (!clinic) redirect('/login')

  // Today's queue across all doctors
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const appts = await db.appointment.findMany({
    where: { clinicId, start: { gte: todayStart, lt: todayEnd } },
    orderBy: { start: 'asc' },
    include: {
      patient: true,
      doctor: { select: { id: true, name: true, speciality: true, currentStatus: true, queueMode: true } },
      service: { select: { name: true } },
      slot: { select: { tokenNo: true } },
    },
  })

  // Group by doctor for display
  const byDoctor = new Map<string, { doctor: { id: string; name: string; speciality: string; currentStatus: string; queueMode: string }; appts: typeof appts }>()
  for (const a of appts) {
    const key = a.doctor.id
    if (!byDoctor.has(key)) byDoctor.set(key, { doctor: a.doctor, appts: [] })
    byDoctor.get(key)!.appts.push(a)
  }

  return (
    <ReceptionistDashboard
      session={session}
      clinicName={clinic.name}
      doctors={doctors}
      groupedQueue={Array.from(byDoctor.values())}
      pendingProofs={pendingProofs}
    />
  )
}
