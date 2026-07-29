import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, doctorNav } from '@/components/dashboard-shell'
import { DoctorCalendar } from './calendar-client'

export const metadata = { title: "My Calendar — ClinicAI" }

export default async function DoctorCalendarPage() {
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
    db.doctor.findUnique({ where: { id: doctorId }, select: { id: true, name: true, slotDurationMin: true, currentStatus: true } }),
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
  ])
  if (!doctor || !clinic) redirect('/login')

  return (
    <DashboardShell userType="doctor" userName={doctor.name} clinicName={clinic.name} navItems={doctorNav}>
      <DoctorCalendar
        doctorId={doctor.id}
        doctorName={doctor.name}
        clinicId={clinicId}
        slotDuration={doctor.slotDurationMin}
      />
    </DashboardShell>
  )
}
