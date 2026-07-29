import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav, financeNav } from '@/components/dashboard-shell'
import { PlatformAccountsClient } from './accounts-client'

export const metadata = { title: 'Payment Accounts — ClinicAI' }

export default async function AccountsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') redirect('/dashboard')

  const navItems = session.type === 'platform_admin' ? platformAdminNav : financeNav

  const accounts = await db.platformAccount.findMany({
    where: { deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <DashboardShell userType={session.type as any} userName={session.name} navItems={navItems}>
      <PlatformAccountsClient accounts={accounts} isAdmin={session.type === 'platform_admin'} />
    </DashboardShell>
  )
}
