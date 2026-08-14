import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { QuickRepliesClient } from '@/app/dashboard/clinic/quick-replies/quick-replies-client'

export const dynamic = 'force-dynamic'

export default async function SettingsQuickRepliesPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId }, select: { name: true } })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={settingsNav} settingsSidebar>
      <QuickRepliesClient />
    </DashboardShell>
  )
}
