import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { LabTestsPage } from './lab-tests-client'

export const metadata = { title: 'Lab Tests — ClinicAI' }

export default async function LabTestsDashboardPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  const tests = await db.labTest.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { name: 'asc' },
  })

  return (
    <DashboardShell userType={session.type} userName={session.name} clinicName="" navItems={clinicAdminNav}>
      <LabTestsPage clinicId={session.clinicId} tests={JSON.parse(JSON.stringify(tests))} />
    </DashboardShell>
  )
}
