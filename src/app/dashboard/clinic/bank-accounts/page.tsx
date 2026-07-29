import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { BankAccountsClient } from './bank-accounts-client'

export const metadata = { title: 'Bank Accounts — ClinicAI' }

export default async function BankAccountsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, accounts] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.clinicBankAccount.findMany({ where: { clinicId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <BankAccountsClient clinicId={clinicId} accounts={accounts} />
    </DashboardShell>
  )
}
