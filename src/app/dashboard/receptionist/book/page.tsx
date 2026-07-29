import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, receptionistNav } from '@/components/dashboard-shell'
import { BookClient } from './book-client'

export const metadata = { title: 'Book Appointment — ClinicAI' }

export default async function BookPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'receptionist' && session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, doctors, services] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.doctor.findMany({ where: { clinicId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, speciality: true, slotDurationMin: true, queueMode: true } }),
    db.service.findMany({ where: { clinicId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, baseFee: true, extraClinicFee: true, doctorId: true } }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="receptionist" userName={session.name} clinicName={clinic.name} navItems={receptionistNav}>
      <BookClient doctors={doctors} services={services} />
    </DashboardShell>
  )
}
