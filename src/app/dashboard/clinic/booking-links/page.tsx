import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { BookingLinksClient } from './booking-links-client'

export const metadata = { title: 'Booking Links — ClinicAI' }

export default async function BookingLinksPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const [clinic, doctors, services] = await Promise.all([
    db.clinic.findUnique({ where: { id: session.clinicId } }),
    db.doctor.findMany({ where: { clinicId: session.clinicId, active: true }, orderBy: { name: 'asc' } }),
    db.service.findMany({ where: { clinicId: session.clinicId, active: true }, include: { doctor: true } }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <BookingLinksClient clinic={clinic} doctors={doctors} services={services} />
    </DashboardShell>
  )
}
