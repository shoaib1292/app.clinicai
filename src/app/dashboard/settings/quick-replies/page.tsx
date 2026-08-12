import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function SettingsQuickRepliesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <DashboardShell userType={session.type} userName={session.name} navItems={settingsNav} settingsSidebar>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Quick Replies</h1>
        <p className="text-muted-foreground">Set up quick reply snippets for your staff.</p>
      </div>
    </DashboardShell>
  )
}
