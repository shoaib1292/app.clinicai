import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

// GET /api/analytics/clinic
// Returns same shape as platform analytics but filtered to the caller's clinic.
async function clinicAnalytics(_req: NextRequest) {
  const { clinicId } = await requireClinicScope()

  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { id: true, name: true, creditBalance: true } })

  const [appts, completedAppts, noShowAppts, cancelledAppts, bookedAppts, conversations, paymentProofs, llmCalls, doctors] = await Promise.all([
    db.appointment.count({ where: { clinicId } }),
    db.appointment.count({ where: { clinicId, status: 'completed' } }),
    db.appointment.count({ where: { clinicId, status: 'no_show' } }),
    db.appointment.count({ where: { clinicId, status: 'cancelled' } }),
    db.appointment.count({ where: { clinicId, status: 'booked' } }),
    db.conversation.count({ where: { clinicId } }),
    db.paymentProof.count({ where: { clinicId } }),
    db.lLMCallLog.count({ where: { clinicId } }),
    db.doctor.count({ where: { clinicId } }),
  ])

  const activeConvos = await db.conversation.count({ where: { clinicId, status: 'active' } })

  // Revenue: completed appointments' totalFee
  const feeAgg = await db.appointment.aggregate({
    where: { clinicId, status: 'completed' },
    _sum: { totalFee: true, doctorFee: true, extraClinicFee: true, platformFee: true },
  })

  // Platform fee debited from credit ledger
  const ledgerDebits = await db.creditLedger.aggregate({
    where: { clinicId, type: 'debit', reason: 'appointment_fee' },
    _sum: { amount: true },
  })

  const ledgerCredits = await db.creditLedger.aggregate({
    where: { clinicId, type: 'credit' },
    _sum: { amount: true },
  })

  // Channel split
  const channelCounts = await db.appointment.groupBy({ by: ['channel'], where: { clinicId }, _count: true })

  // Payment mode split
  const paymentModeCounts = await db.appointment.groupBy({ by: ['paymentMode'], where: { clinicId }, _count: true })

  // Daily breakdown last 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const recentAppts = await db.appointment.findMany({
    where: { clinicId, createdAt: { gte: since } },
    select: { createdAt: true, start: true, status: true, totalFee: true, channel: true, paymentMode: true, doctorId: true },
  })

  const byDay = new Map<string, { count: number; revenue: number }>()
  const byHour = new Array(24).fill(0)
  for (const a of recentAppts) {
    const key = a.createdAt.toISOString().slice(0, 10)
    if (!byDay.has(key)) byDay.set(key, { count: 0, revenue: 0 })
    const entry = byDay.get(key)!
    entry.count++
    if (a.status === 'completed') entry.revenue += a.totalFee
    byHour[new Date(a.start).getHours()]++
  }

  // Doctor utilisation (last 14 days): appointment count + completed rate
  const doctorIds = (await db.doctor.findMany({ where: { clinicId }, select: { id: true, name: true } })).map((d) => ({ id: d.id, name: d.name }))
  const doctorUtil = await Promise.all(
    doctorIds.map(async (d) => {
      const [total, completed] = await Promise.all([
        db.appointment.count({ where: { clinicId, doctorId: d.id, createdAt: { gte: since } } }),
        db.appointment.count({ where: { clinicId, doctorId: d.id, createdAt: { gte: since }, status: 'completed' } }),
      ])
      return { doctorId: d.id, name: d.name, total, completed, utilisation: total ? (completed / total) * 100 : 0 }
    }),
  )

  // AI deflection rate: conversations where agent handled without staff takeover
  const totalConvos = await db.conversation.count({ where: { clinicId } })
  const takenOver = await db.conversation.count({ where: { clinicId, takenOverBy: { not: null } } })
  const deflectionRate = totalConvos ? ((totalConvos - takenOver) / totalConvos) * 100 : 0

  return ok({
    overview: {
      appointments: appts,
      completedAppts,
      noShowAppts,
      cancelledAppts,
      bookedAppts,
      conversations,
      activeConvos,
      paymentProofs,
      doctors,
      llmCalls,
      creditBalance: clinic?.creditBalance ?? 0,
      totalRevenue: feeAgg._sum.totalFee ?? 0,
      totalDoctorFee: feeAgg._sum.doctorFee ?? 0,
      totalExtraClinicFee: feeAgg._sum.extraClinicFee ?? 0,
      totalPlatformFee: ledgerDebits._sum.amount ?? 0,
      totalTopups: ledgerCredits._sum.amount ?? 0,
    },
    noShowRate: appts ? (noShowAppts / appts) * 100 : 0,
    deflectionRate,
    channelSplit: channelCounts,
    paymentModeSplit: paymentModeCounts,
    daily: Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v })).sort(),
    peakHours: byHour.map((count, hour) => ({ hour, count })),
    doctorUtilisation: doctorUtil,
  })
}

export const GET = handle(clinicAnalytics)
