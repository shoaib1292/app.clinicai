import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { ReceptionistsClient } from './receptionists-client'

export const metadata = { title: 'Receptionists — ClinicAI' }

export default async function ReceptionistsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, receptionists] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.receptionist.findMany({ where: { clinicId }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, phone: true, active: true, createdAt: true } }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <ReceptionistsClient receptionists={receptionists} />
    </DashboardShell>
  )
}
