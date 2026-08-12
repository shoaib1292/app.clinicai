import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { LabReportsClient } from './lab-reports-client'

export const metadata = { title: 'Lab Reports — ClinicAI' }

export default async function LabReportsDashboardPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')
  return (
    <DashboardShell userType={session.type} userName={session.name} clinicName="" navItems={clinicAdminNav}>
      <LabReportsClient clinicId={session.clinicId} />
    </DashboardShell>
  )
}
