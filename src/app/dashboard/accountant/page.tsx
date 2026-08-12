import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { AccountantDashboard } from './accountant-dashboard'

export const dynamic = 'force-dynamic'

export default async function AccountantDashboardPage() {
  const session = await getSession()
  if (!session || session.type !== 'accountant') redirect('/login')

  const pendingProofs = await db.paymentProof.count({
    where: { clinicId: session.clinicId, status: 'pending' },
  })
  const creditBalance = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: { creditBalance: true },
  })

  return (
    <AccountantDashboard
      clinicName={session.name}
      stats={{
        pendingPayments: pendingProofs,
        creditBalance: creditBalance?.creditBalance || 0,
      }}
    />
  )
}
