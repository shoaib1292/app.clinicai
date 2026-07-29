import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { ClinicsListClient } from './clinics-list-client'

export const metadata = { title: 'Clinics — ClinicAI Platform' }

export default async function ClinicsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') redirect('/dashboard')

  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { appointments: true, doctors: true, patients: true } },
      agentToggle: true,
    },
  })

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <ClinicsListClient initialClinics={clinics} />
    </DashboardShell>
  )
}
