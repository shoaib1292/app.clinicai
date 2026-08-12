import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function SettingsTemplatesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <DashboardShell userType={session.type} userName={session.name} navItems={settingsNav} settingsSidebar>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Message Templates</h1>
        <p className="text-muted-foreground">Manage WhatsApp message templates for your clinic.</p>
      </div>
    </DashboardShell>
  )
}
