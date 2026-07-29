import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType } from '@/lib/session'
import { ok, handle } from '@/lib/api'

async function platformAnalytics(_req: NextRequest) {
  await requireType('platform_admin', 'platform_staff')

  const [clinics, appts, llmCalls, conversations, paymentProofs] = await Promise.all([
    db.clinic.count(),
    db.appointment.count(),
    db.lLMCallLog.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }),
    db.conversation.count(),
    db.paymentProof.count(),
  ])

  const activeClinics = await db.clinic.count({ where: { status: 'active' } })
  const trialClinics = await db.clinic.count({ where: { status: 'trial' } })
  const completedAppts = await db.appointment.count({ where: { status: 'completed' } })
  const noShowAppts = await db.appointment.count({ where: { status: 'no_show' } })
  const cancelledAppts = await db.appointment.count({ where: { status: 'cancelled' } })
  const bookedAppts = await db.appointment.count({ where: { status: 'booked' } })

  // Revenue (platform fees)
  const feeAgg = await db.appointmentFees.aggregate({ _sum: { platformFee: true, total: true } })
  const ledgerDebits = await db.creditLedger.aggregate({ where: { type: 'debit', reason: 'appointment_fee' }, _sum: { amount: true } })

  // LLM cost
  const llmCostAgg = await db.lLMCallLog.aggregate({ _sum: { costUsd: true } })

  // Channel split
  const channelCounts = await db.appointment.groupBy({ by: ['channel'], _count: true })

  // Daily appointments last 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const recentAppts = await db.appointment.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true, totalFee: true, channel: true, paymentMode: true },
  })
  const byDay = new Map<string, { count: number; revenue: number }>()
  for (const a of recentAppts) {
    const key = a.createdAt.toISOString().slice(0, 10)
    if (!byDay.has(key)) byDay.set(key, { count: 0, revenue: 0 })
    const entry = byDay.get(key)!
    entry.count++
    if (a.status === 'completed') entry.revenue += a.totalFee
  }

  // Payment mode split
  const paymentModeCounts = await db.appointment.groupBy({ by: ['paymentMode'], _count: true })

  return ok({
    overview: {
      clinics,
      activeClinics,
      trialClinics,
      appointments: appts,
      completedAppts,
      noShowAppts,
      cancelledAppts,
      bookedAppts,
      conversations,
      paymentProofs,
      totalPlatformFee: ledgerDebits._sum.amount ?? 0,
      totalRevenue: feeAgg._sum.total ?? 0,
      llmCostUsd: llmCostAgg._sum.costUsd ?? 0,
    },
    noShowRate: appts ? (noShowAppts / appts) * 100 : 0,
    channelSplit: channelCounts,
    paymentModeSplit: paymentModeCounts,
    daily: Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v })).sort(),
  })
}

export const GET = handle(platformAnalytics)
