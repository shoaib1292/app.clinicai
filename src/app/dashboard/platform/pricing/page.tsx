import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { PricingClient } from './pricing-client'

export const metadata = { title: 'Pricing Rules — ClinicAI Platform' }

export default async function PricingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin') redirect('/dashboard')

  const [rules, clinics] = await Promise.all([
    db.pricingRule.findMany({
      orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
      include: { clinic: { select: { id: true, name: true, slug: true } } },
    }),
    db.clinic.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <PricingClient initialRules={rules} clinics={clinics} />
    </DashboardShell>
  )
}
