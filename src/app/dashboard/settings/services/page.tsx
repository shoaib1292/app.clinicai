import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { ServicesClient } from '@/app/dashboard/clinic/services/services-client'

export const dynamic = 'force-dynamic'

export default async function SettingsServicesPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  const services = await db.service.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { name: 'asc' },
    include: { doctor: { select: { name: true } } },
  })

  return (
    <DashboardShell userType={session.type} userName={session.name} navItems={settingsNav} settingsSidebar>
      <ServicesClient clinicId={session.clinicId} services={JSON.parse(JSON.stringify(services))} />
    </DashboardShell>
  )
}
