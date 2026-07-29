import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { ServicesClient } from './services-client'

export const metadata = { title: 'Services — ClinicAI' }

export default async function ServicesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, services, doctors] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.service.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { select: { id: true, name: true } }, _count: { select: { appointments: true } } },
    }),
    db.doctor.findMany({ where: { clinicId, active: true }, select: { id: true, name: true, speciality: true }, orderBy: { name: 'asc' } }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <ServicesClient services={services} doctors={doctors} />
    </DashboardShell>
  )
}
