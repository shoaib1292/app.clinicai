import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, financeNav } from '@/components/dashboard-shell'
import { ProofsClient } from './proofs-client'

export const metadata = { title: 'Payment Proofs — ClinicAI Finance' }

export default async function FinanceProofsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    if (session.type === 'clinic_admin') redirect('/dashboard/payments')
    redirect('/dashboard')
  }
  if (session.type === 'platform_staff' && session.role !== 'finance' && session.role !== 'support') {
    redirect('/dashboard/platform')
  }

  const proofs = await db.paymentProof.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: {
      clinic: { select: { id: true, name: true } },
      appointment: { select: { id: true, start: true, patient: { select: { name: true, phone: true } } } },
    },
  })

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={financeNav}>
      <ProofsClient initialProofs={proofs} scope="platform" />
    </DashboardShell>
  )
}
