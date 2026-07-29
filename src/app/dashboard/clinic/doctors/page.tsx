import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { DoctorsClient } from './doctors-client'

export const metadata = { title: 'Doctors — ClinicAI' }

export default async function DoctorsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, doctors] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.doctor.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
      include: { services: true, _count: { select: { appointments: true, slots: true } } },
    }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <DoctorsClient doctors={doctors} />
    </DashboardShell>
  )
}
