import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

async function analytics(req: NextRequest) {
  const { clinicId } = await requireClinicScope()

  const [activeOffers, totalRedemptions, referralBookings, earnedRewards, referralPatients] = await Promise.all([
    db.offer.count({ where: { clinicId, active: true } }),
    db.offerRedemption.count({ where: { clinicId } }),
    db.referralEvent.count({ where: { clinicId, status: { in: ['booked', 'completed'] } } }),
    db.referralEvent.aggregate({
      where: { clinicId, rewardStatus: 'earned' },
      _sum: { rewardAmount: true },
    }),
    db.referralEvent.groupBy({
      by: ['referrerPatientId'],
      where: { clinicId, status: 'completed' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ])

  // Get referrer names
  const topReferrerIds = referralPatients.map((r) => r.referrerPatientId)
  const referrers = topReferrerIds.length > 0
    ? await db.patient.findMany({ where: { id: { in: topReferrerIds } }, select: { id: true, name: true, phone: true } })
    : []

  const topReferrers = referralPatients.map((r) => {
    const p = referrers.find((p) => p.id === r.referrerPatientId)
    return { patientId: r.referrerPatientId, name: p?.name, phone: p?.phone, referrals: r._count.id }
  })

  return ok({
    activeOffers,
    totalRedemptions,
    referralBookings,
    totalRewardsGiven: earnedRewards._sum.rewardAmount ?? 0,
    topReferrers,
  })
}

export const GET = handle(analytics)
