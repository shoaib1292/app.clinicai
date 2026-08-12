import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { OffersClient } from './offers-client'

export const dynamic = 'force-dynamic'

export default async function OffersPage() {
  const session = await getSession()
  if (!session || session.type !== 'clinic_admin') redirect('/login')

  const clinicId = session.clinicId
  if (!clinicId) redirect('/login')

  const [offers, referralProgram, services, doctors] = await Promise.all([
    db.offer.findMany({ where: { clinicId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { redemptions: true } } } }),
    db.referralProgram.findUnique({ where: { clinicId } }),
    db.service.findMany({ where: { clinicId, active: true }, select: { id: true, name: true } }),
    db.doctor.findMany({ where: { clinicId, active: true }, select: { id: true, name: true } }),
  ])

  // Analytics
  const [activeOffersCount, totalRedemptions, referralBookings, rewardsSum] = await Promise.all([
    db.offer.count({ where: { clinicId, active: true } }),
    db.offerRedemption.count({ where: { clinicId } }),
    db.referralEvent.count({ where: { clinicId, status: { in: ['booked', 'completed'] } } }),
    db.referralEvent.aggregate({ where: { clinicId, rewardStatus: 'earned' }, _sum: { rewardAmount: true } }),
  ])

  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { slug: true } })

  const analytics = {
    activeOffers: activeOffersCount,
    totalRedemptions,
    referralBookings,
    totalRewardsGiven: rewardsSum._sum.rewardAmount ?? 0,
  }

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} navItems={clinicAdminNav}>
      <OffersClient
        initialOffers={JSON.parse(JSON.stringify(offers))}
        initialReferralProgram={referralProgram ? JSON.parse(JSON.stringify(referralProgram)) : null}
        services={JSON.parse(JSON.stringify(services))}
        doctors={JSON.parse(JSON.stringify(doctors))}
        clinicSlug={clinic?.slug ?? ''}
        initialAnalytics={analytics}
      />
    </DashboardShell>
  )
}
