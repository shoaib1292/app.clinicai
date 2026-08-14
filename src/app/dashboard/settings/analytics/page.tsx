import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { ClinicAnalyticsClient } from '@/app/dashboard/clinic/analytics'

export const dynamic = 'force-dynamic'

export default async function SettingsAnalyticsPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: { name: true, logoUrl: true },
  })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} clinicLogoUrl={clinic.logoUrl} navItems={settingsNav} settingsSidebar>
      <ClinicAnalyticsClient clinicId={session.clinicId} />
    </DashboardShell>
  )
}
