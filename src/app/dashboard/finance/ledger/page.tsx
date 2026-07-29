import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, financeNav } from '@/components/dashboard-shell'
import { LedgerClient } from './ledger-client'

export const metadata = { title: 'Credit Ledger — ClinicAI Finance' }

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ clinic?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    if (session.type === 'clinic_admin') redirect('/dashboard/billing')
    redirect('/dashboard')
  }
  if (session.type === 'platform_staff' && session.role !== 'finance' && session.role !== 'support') {
    redirect('/dashboard/platform')
  }

  const sp = await searchParams
  const clinics = await db.clinic.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, creditBalance: true } })

  const queryClinicId = sp.clinic
  const selectedClinicId = (queryClinicId && clinics.some((c) => c.id === queryClinicId)) ? queryClinicId : clinics[0]?.id || ''

  let initialEntries: Array<{ id: string; type: string; amount: number; reason: string; appointmentId: string | null; paymentProofId: string | null; balanceAfter: number; createdAt: Date }> = []
  if (selectedClinicId) {
    initialEntries = await db.creditLedger.findMany({
      where: { clinicId: selectedClinicId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  }

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={financeNav}>
      <LedgerClient clinics={clinics} initialClinicId={selectedClinicId} initialEntries={initialEntries} />
    </DashboardShell>
  )
}
