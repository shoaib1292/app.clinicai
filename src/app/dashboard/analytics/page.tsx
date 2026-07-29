import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { AnalyticsClient } from './analytics-client'

export const metadata = { title: 'Analytics — ClinicAI' }

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <AnalyticsClient />
    </DashboardShell>
  )
}
