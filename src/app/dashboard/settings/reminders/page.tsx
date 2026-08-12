import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function SettingsRemindersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <DashboardShell userType={session.type} userName={session.name} navItems={settingsNav} settingsSidebar>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reminders</h1>
        <p className="text-muted-foreground">Configure appointment reminder settings.</p>
      </div>
    </DashboardShell>
  )
}
