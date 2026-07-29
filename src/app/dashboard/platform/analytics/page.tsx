import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { PlatformAnalyticsClient } from './analytics-client'

export const metadata = { title: 'Platform Analytics — ClinicAI' }

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') redirect('/dashboard')

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <PlatformAnalyticsClient />
    </DashboardShell>
  )
}
