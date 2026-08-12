import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { GoogleIntegrationTab } from '@/app/dashboard/settings/components/google-integration-tab'

export const dynamic = 'force-dynamic'

export default async function SettingsGooglePage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: { id: true, name: true, logoUrl: true },
  })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell
      userType={session.type}
      userName={session.name}
      clinicName={clinic.name}
      clinicLogoUrl={clinic.logoUrl}
      navItems={settingsNav}
      settingsSidebar
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Google Integration</h1>
          <p className="text-muted-foreground">Connect Google Calendar, Meet, Gmail, Drive, and more.</p>
        </div>
        <GoogleIntegrationTab clinicId={clinic.id} />
      </div>
    </DashboardShell>
  )
}
