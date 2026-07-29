import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { PlatformDashboard } from './platform-dashboard'

export const metadata = { title: 'Platform Admin — ClinicAI' }

export default async function PlatformHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    redirect('/dashboard')
  }

  // Stats for the platform overview
  const [clinics, staff, appointments, llmKeys, leads, pendingProofs, conversations] = await Promise.all([
    db.clinic.count(),
    db.platformStaff.count({ where: { active: true } }),
    db.appointment.count(),
    db.lLMKey.count({ where: { enabled: true } }),
    db.lead.count({ where: { status: 'new' } }),
    db.paymentProof.count({ where: { status: 'pending' } }),
    db.conversation.count({ where: { status: 'active' } }),
  ])

  const totalRevenue = await db.creditLedger.aggregate({
    where: { type: 'debit', reason: 'appointment_fee' },
    _sum: { amount: true },
  })

  const recentClinics = await db.clinic.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, slug: true, city: true, status: true, creditBalance: true, agentEnabled: true, _count: { select: { appointments: true } } },
  })

  const recentLeads = await db.lead.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { claimedBy: true },
  })

  return (
    <PlatformDashboard
      session={session}
      stats={{
        clinics,
        staff,
        appointments,
        llmKeys,
        leads,
        pendingProofs,
        conversations,
        totalRevenue: totalRevenue._sum.amount ?? 0,
      }}
      recentClinics={recentClinics}
      recentLeads={recentLeads}
    />
  )
}
