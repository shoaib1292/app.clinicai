import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DoctorDashboard } from './doctor-dashboard'
import { store } from '@/lib/store'

export const metadata = { title: "Doctor Dashboard — ClinicAI" }

export default async function DoctorDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'doctor') {
    if (session.type === 'clinic_admin') redirect('/dashboard/clinic')
    if (session.type === 'receptionist') redirect('/dashboard/receptionist')
    redirect('/dashboard')
  }

  const doctorId = session.sub
  const clinicId = session.clinicId

  const [doctor, clinic] = await Promise.all([
    db.doctor.findUnique({ where: { id: doctorId }, include: { services: true } }),
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
  ])
  if (!doctor || !clinic) redirect('/login')

  // Today's appointments ordered by start
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const todayAppts = await db.appointment.findMany({
    where: { clinicId, doctorId, start: { gte: todayStart, lt: todayEnd } },
    orderBy: { start: 'asc' },
    include: {
      patient: true,
      service: true,
      slot: true,
    },
  })

  const currentToken = store.getCurrentToken(clinicId, doctorId)

  const stats = {
    todayTotal: todayAppts.length,
    completed: todayAppts.filter((a) => a.status === 'completed').length,
    noShows: todayAppts.filter((a) => a.status === 'no_show').length,
    upcoming: todayAppts.filter((a) => a.status === 'booked' || a.status === 'confirmed').length,
  }

  return (
    <DoctorDashboard
      session={session}
      clinicName={clinic.name}
      doctor={doctor}
      todayAppts={todayAppts}
      stats={stats}
      currentToken={currentToken}
    />
  )
}
