import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { LabOrdersClient } from './lab-orders-client'

export const metadata = { title: 'Lab Orders — ClinicAI' }

export default async function LabOrdersDashboardPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')
  return (
    <DashboardShell userType={session.type} userName={session.name} clinicName="" navItems={clinicAdminNav}>
      <LabOrdersClient clinicId={session.clinicId} />
    </DashboardShell>
  )
}
