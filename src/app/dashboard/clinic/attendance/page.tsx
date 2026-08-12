import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { AttendancePage } from './attendance-client'

export const metadata = { title: 'Attendance — ClinicAI' }

export default async function AttendanceDashboardPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')
  return (
    <DashboardShell userType={session.type} userName={session.name} clinicName="" navItems={clinicAdminNav}>
      <AttendancePage clinicId={session.clinicId} />
    </DashboardShell>
  )
}
