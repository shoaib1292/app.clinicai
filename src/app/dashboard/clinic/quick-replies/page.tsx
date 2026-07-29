import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { QuickRepliesClient } from './quick-replies-client'

export const metadata = { title: 'Quick Reply Snippets — ClinicAI' }

export default async function QuickRepliesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin' && session.type !== 'receptionist') redirect('/dashboard')

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: { name: true },
  })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <QuickRepliesClient />
    </DashboardShell>
  )
}
