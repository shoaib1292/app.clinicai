import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { ClinicDashboard } from './clinic-dashboard'

export const metadata = { title: 'Clinic Admin — ClinicAI' }

export default async function ClinicHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') {
    // other clinic-scoped users get their own dashboards
    if (session.type === 'doctor') redirect('/dashboard/doctor')
    if (session.type === 'receptionist') redirect('/dashboard/receptionist')
    redirect('/dashboard')
  }

  // Enforce email verification for password-signup admins.
  const admin = await db.clinicAdmin.findUnique({
    where: { id: session.sub },
    select: { emailVerified: true },
  })
  if (!admin?.emailVerified) {
    redirect(`/signup/verify?email=${encodeURIComponent(admin?.email || session.email || '')}`)
  }

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    include: {
      doctors: { include: { _count: { select: { appointments: true } } } },
      receptionists: true,
      agentToggle: true,
      bankAccounts: true,
      _count: { select: { appointments: true, patients: true, conversations: true } },
    },
  })
  if (!clinic) redirect('/login')

  const today = new Date()
  const todayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // 7-day window for the mini chart (includes today)
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)

  const [todayAppts, activeConvos, pendingPayments, recentConvos, todayStats, weekStats, feedbackStats] = await Promise.all([
    db.appointment.findMany({
      where: { clinicId: clinic.id, start: { gte: todayStart, lt: todayEnd } },
      orderBy: { start: 'asc' },
      take: 10,
      include: { patient: true, doctor: true, service: true },
    }),
    db.conversation.count({ where: { clinicId: clinic.id, status: 'active' } }),
    db.paymentProof.count({ where: { clinicId: clinic.id, status: 'pending' } }),
    db.conversation.findMany({
      where: { clinicId: clinic.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { patient: true, _count: { select: { messages: true } } },
    }),
    // Today's KPI breakdown
    db.appointment.groupBy({
      by: ['status'],
      where: { clinicId: clinic.id, start: { gte: todayStart, lt: todayEnd } },
      _sum: { totalFee: true },
      _count: true,
    }),
    // Last 7 days appointments + revenue (one row per day)
    db.appointment.findMany({
      where: {
        clinicId: clinic.id,
        start: { gte: sevenDaysAgo, lt: todayEnd },
        status: { in: ['completed', 'booked', 'confirmed'] },
      },
      select: { start: true, totalFee: true, status: true },
    }),
    // Feedback stats
    db.appointmentFeedback.aggregate({
      where: { clinicId: clinic.id },
      _avg: { rating: true },
      _count: true,
    }),
  ])

  // Compute today's KPIs from the groupBy result
  const statusBreakdown: Record<string, { count: number; revenue: number }> = {}
  for (const row of todayStats) {
    statusBreakdown[row.status] = {
      count: row._count,
      revenue: row._sum.totalFee ?? 0,
    }
  }
  const todayCompleted = statusBreakdown.completed?.count ?? 0
  const todayNoShow = (statusBreakdown.no_show?.count ?? 0) + (statusBreakdown.late_no_show?.count ?? 0)
  const todayCancelled = statusBreakdown.cancelled?.count ?? 0
  const todayBooked = (statusBreakdown.booked?.count ?? 0) + (statusBreakdown.confirmed?.count ?? 0) + (statusBreakdown.held?.count ?? 0)
  const todayRevenue =
    (statusBreakdown.completed?.revenue ?? 0) +
    (statusBreakdown.booked?.revenue ?? 0) +
    (statusBreakdown.confirmed?.revenue ?? 0)

  // Build 7-day chart data
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekChart: { label: string; value: number; highlight: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const dayAppts = weekStats.filter((a) => a.start >= dayStart && a.start < dayEnd)
    const revenue = dayAppts.reduce((s, a) => s + (a.totalFee ?? 0), 0)
    weekChart.push({
      label: dayLabels[dayStart.getDay()],
      value: revenue,
      highlight: i === 0, // today
    })
  }

  return (
    <ClinicDashboard
      session={session}
      clinic={clinic}
      todayAppts={todayAppts}
      activeConvos={activeConvos}
      pendingPayments={pendingPayments}
      recentConvos={recentConvos}
      todaySummary={{
        completed: todayCompleted,
        noShow: todayNoShow,
        cancelled: todayCancelled,
        booked: todayBooked,
        revenue: todayRevenue,
        totalToday: todayAppts.length,
      }}
      weekChart={weekChart}
      feedbackSummary={{
        avgRating: feedbackStats._avg.rating ? Number(feedbackStats._avg.rating.toFixed(1)) : null,
        totalReviews: feedbackStats._count,
      }}
    />
  )
}
