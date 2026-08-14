import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { BankAccountsClient } from '@/app/dashboard/clinic/bank-accounts/bank-accounts-client'

export const dynamic = 'force-dynamic'

export default async function SettingsBankAccountsPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, accounts] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.clinicBankAccount.findMany({ where: { clinicId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={settingsNav} settingsSidebar>
      <BankAccountsClient clinicId={clinicId} accounts={accounts} />
    </DashboardShell>
  )
}
