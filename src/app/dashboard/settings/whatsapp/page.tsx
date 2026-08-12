import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function SettingsWhatsAppPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  return (
    <DashboardShell userType={session.type} userName={session.name} navItems={settingsNav} settingsSidebar>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">WhatsApp Connection</h1>
        <p className="text-muted-foreground">Connect WhatsApp to enable the AI receptionist. Go to the WhatsApp page for full setup.</p>
      </div>
    </DashboardShell>
  )
}
