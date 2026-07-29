import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { LeadsClient } from './leads-client'

export const metadata = { title: 'Leads — ClinicAI Platform' }

export default async function LeadsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') redirect('/dashboard')

  const [leads, staff, clinics] = await Promise.all([
    db.lead.findMany({ orderBy: { createdAt: 'desc' }, include: { claimedBy: true, clinic: { select: { name: true } } } }),
    db.platformStaff.findMany({ where: { active: true, role: 'sales' } }),
    db.clinic.findMany({ select: { id: true, name: true } }),
  ])

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <LeadsClient initialLeads={leads} salesStaff={staff} clinics={clinics} canManage={session.type === 'platform_admin' || session.role === 'sales'} />
    </DashboardShell>
  )
}
