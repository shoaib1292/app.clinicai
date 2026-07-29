import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { BillingClient } from './billing-client'

export const metadata = { title: 'Billing & Wallet — ClinicAI' }

export default async function BillingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, ledger, invoices, bankAccounts] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { id: true, name: true, creditBalance: true, settlementMode: true } }),
    db.creditLedger.findMany({ where: { clinicId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    db.invoice.findMany({ where: { clinicId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.clinicBankAccount.findMany({ where: { clinicId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <BillingClient clinic={clinic} ledger={ledger} invoices={invoices} bankAccounts={bankAccounts} />
    </DashboardShell>
  )
}
