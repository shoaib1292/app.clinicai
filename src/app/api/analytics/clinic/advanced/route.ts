import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

// GET /api/analytics/clinic/advanced?clinicId=xxx
// Returns advanced analytics: revenue forecast, churn, doctor benchmarks, peak hours, patient cohorts
async function advancedClinicAnalytics(_req: NextRequest) {
  const { clinicId } = await requireClinicScope()

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // ── Overview ──────────────────────────────────────────────

  const [
    totalAppointments,
    completedAppointments,
    noShowAppointments,
    activePatients,
    feeAgg,
  ] = await Promise.all([
    db.appointment.count({ where: { clinicId } }),
    db.appointment.count({ where: { clinicId, status: 'completed' } }),
    db.appointment.count({ where: { clinicId, status: 'no_show' } }),
    db.patient.count({
      where: { clinicId, appointments: { some: { createdAt: { gte: ninetyDaysAgo } } } },
    }),
    db.appointment.aggregate({
      where: { clinicId, status: 'completed' },
      _sum: { totalFee: true, doctorFee: true },
    }),
  ])

  const noShowRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0

  // ── Average Rating (from feedback) ────────────────────────
  const feedbackAgg = await db.appointmentFeedback.aggregate({
    where: { clinicId },
    _avg: { rating: true },
  })

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ── Average Wait Time (from checkInTime vs start) ─────────
  const recentCheckins30 = await db.appointment.findMany({
    where: { clinicId, status: 'completed', checkInTime: { not: null }, createdAt: { gte: thirtyDaysAgo } },
    select: { checkInTime: true, start: true },
    take: 500,
  })

  let avgWaitMins = 0
  if (recentCheckins30.length > 0) {
    const totalWait = recentCheckins30.reduce((sum, a) => {
      return sum + Math.abs((a.start!.getTime() - a.checkInTime!.getTime()) / 60000)
    }, 0)
    avgWaitMins = Math.round(totalWait / recentCheckins30.length)
  }

  // ── Churn Rate (last 30 days) ─────────────────────────────
  const patientsBefore30 = await db.patient.count({
    where: {
      clinicId,
      appointments: { some: { createdAt: { lt: thirtyDaysAgo } } },
    },
  })
  const patientsActive30 = await db.patient.count({
    where: {
      clinicId,
      appointments: { some: { createdAt: { gte: thirtyDaysAgo } } },
    },
  })
  const churnRate = patientsBefore30 > 0
    ? Math.max(0, ((patientsBefore30 - patientsActive30) / patientsBefore30) * 100)
    : 0

  // ── Revenue Forecast (monthly, last 12 months) ────────────
  const last12RevenueRaw = await db.appointment.findMany({
    where: { clinicId, status: 'completed', createdAt: { gte: oneYearAgo } },
    select: { createdAt: true, totalFee: true },
  })

  const monthlyRevenue = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyRevenue.set(key, 0)
  }
  for (const a of last12RevenueRaw) {
    const key = `${a.createdAt.getFullYear()}-${String(a.createdAt.getMonth() + 1).padStart(2, '0')}`
    if (monthlyRevenue.has(key)) {
      monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + a.totalFee)
    }
  }

  const revenueForecast = Array.from(monthlyRevenue.entries()).map(([month, actual]) => {
    // Simple linear forecast: average of last 3 months
    const entries = Array.from(monthlyRevenue.values())
    const last3 = entries.slice(-3).filter((v) => v > 0)
    const forecast = last3.length > 0 ? Math.round(last3.reduce((a, b) => a + b, 0) / last3.length) : actual
    return { month, actual, forecast }
  })

  // ── Churn Data (monthly for last 6 months) ───────────────
  const churnData: Array<{ month: string; rate: number; retained: number }> = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`

    const prevActive = await db.patient.count({
      where: {
        clinicId,
        appointments: { some: { createdAt: { lt: monthStart } } },
      },
    })
    const currActive = await db.patient.count({
      where: {
        clinicId,
        appointments: { some: { createdAt: { gte: monthStart, lt: monthEnd } } },
      },
    })

    const rate = prevActive > 0 ? Math.max(0, ((prevActive - currActive) / prevActive) * 100) : 0
    churnData.push({ month: monthStr, rate: Math.round(rate * 10) / 10, retained: currActive })
  }

  // ── Peak Hours (last 14 days) ─────────────────────────────
  const recentAppts = await db.appointment.findMany({
    where: { clinicId, createdAt: { gte: twoWeeksAgo } },
    select: { start: true, totalFee: true },
  })

  const hourBuckets = new Array(24).fill(0).map(() => ({ count: 0, revenue: 0 }))
  for (const a of recentAppts) {
    const h = new Date(a.start).getHours()
    hourBuckets[h].count++
    hourBuckets[h].revenue += a.totalFee
  }
  const peakHours = hourBuckets.map((b, hour) => ({ hour, ...b }))

  // ── Doctor Benchmarks (last 30 days) ──────────────────────
  const doctors = await db.doctor.findMany({
    where: { clinicId },
    select: { id: true, name: true },
  })
  const thirtyDaysAgo2 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const doctorBenchmarks = await Promise.all(
    doctors.map(async (doc) => {
      const appts = await db.appointment.findMany({
        where: { clinicId, doctorId: doc.id, createdAt: { gte: thirtyDaysAgo2 } },
        select: { status: true, totalFee: true, checkInTime: true, start: true },
      })
      const total = appts.length
      const completed = appts.filter((a) => a.status === 'completed').length
      const noShows = appts.filter((a) => a.status === 'no_show').length
      const feedbackRatings = await db.appointmentFeedback.findMany({
        where: { clinicId, doctorId: doc.id, rating: { gt: 0 } },
        select: { rating: true },
      })
      const ratings = feedbackRatings.map((f) => f.rating)
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

      let waitTimes = 0
      let waitCount = 0
      for (const a of appts) {
        if (a.checkInTime && a.start) {
          waitTimes += Math.abs((a.start.getTime() - a.checkInTime.getTime()) / 60000)
          waitCount++
        }
      }

      return {
        doctorId: doc.id,
        doctorName: doc.name,
        avgRating: Math.round(avgRating * 10) / 10,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        noShowRate: total > 0 ? Math.round((noShows / total) * 100) : 0,
        avgWaitMins: waitCount > 0 ? Math.round(waitTimes / waitCount) : 0,
        totalPatients: total,
        revenuePerPatient: total > 0 ? Math.round((appts.reduce((s, a) => s + a.totalFee, 0)) / total) : 0,
      }
    }),
  )

  // ── Patient Cohorts (monthly, last 6 months) ──────────────
  const patientCohorts: Array<{ month: string; newPatients: number; returningPatients: number; churned: number }> = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`

    const newPats = await db.patient.count({
      where: {
        clinicId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    })

    const returningPats = await db.patient.count({
      where: {
        clinicId,
        createdAt: { lt: monthStart },
        appointments: { some: { createdAt: { gte: monthStart, lt: monthEnd } } },
      },
    })

    // Patients active before this month who had no appointment this month
    const allBefore = await db.patient.count({
      where: {
        clinicId,
        appointments: { some: { createdAt: { lt: monthStart } } },
      },
    })
    const stillActive = await db.patient.count({
      where: {
        clinicId,
        appointments: { some: { createdAt: { gte: monthStart, lt: monthEnd } } },
      },
    })
    const churned = Math.max(0, allBefore - (stillActive - newPats))

    patientCohorts.push({ month: monthStr, newPatients: newPats, returningPatients: returningPats, churned })
  }

  // ── Weekday Distribution (last 30 days) ───────────────────
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekdayBuckets = new Array(7).fill(0).map(() => ({ count: 0, revenue: 0 }))
  for (const a of recentCheckins30) {
    const day = a.start!.getDay()
    weekdayBuckets[day].count++
    // Revenue not directly available here, approximating
  }
  // Get revenue by weekday from completed appointments
  const weekdayRevenue = await db.appointment.findMany({
    where: { clinicId, status: 'completed', createdAt: { gte: thirtyDaysAgo } },
    select: { start: true, totalFee: true },
  })
  for (const a of weekdayRevenue) {
    const day = a.start.getDay()
    weekdayBuckets[day].revenue += a.totalFee
  }

  const weekdayDistribution = weekdayBuckets.map((b, i) => ({
    day: weekdayNames[i],
    ...b,
    revenue: Math.round(b.revenue),
  }))

  // ── Service Mix (last 90 days) ────────────────────────────
  const apptWithService = await db.appointment.findMany({
    where: { clinicId, serviceId: { not: null }, createdAt: { gte: ninetyDaysAgo } },
    select: { service: { select: { name: true } }, totalFee: true },
  })
  const serviceAgg = new Map<string, { count: number; revenue: number }>()
  for (const a of apptWithService) {
    const name = a.service?.name ?? 'Unknown'
    const cur = serviceAgg.get(name) || { count: 0, revenue: 0 }
    cur.count++
    cur.revenue += a.totalFee
    serviceAgg.set(name, cur)
  }
  const serviceMix = Array.from(serviceAgg.entries())
    .map(([service, v]) => ({ service, count: v.count, revenue: v.revenue }))
    .sort((a, b) => b.count - a.count)

  // ── Appointment-Type Mix (last 90 days) ───────────────────
  const typeCounts = await db.appointment.groupBy({
    by: ['type'],
    where: { clinicId, createdAt: { gte: ninetyDaysAgo } },
    _count: true,
    _sum: { totalFee: true },
  })
  const appointmentTypeMix = typeCounts.map((t) => ({
    type: t.type,
    count: t._count,
    revenue: t._sum.totalFee || 0,
  }))

  // ── Repeat-Patient Rate (last 90 days) ────────────────────
  const patientsWithMultiple = await db.patient.findMany({
    where: {
      clinicId,
      appointments: { some: { createdAt: { gte: ninetyDaysAgo } } },
    },
    select: { appointments: { where: { createdAt: { gte: ninetyDaysAgo } }, select: { id: true } } },
  })
  const patientsWithAppts = patientsWithMultiple.length
  const repeatPatients = patientsWithMultiple.filter((p) => p.appointments.length > 1).length
  const repeatPatientRate = patientsWithAppts > 0 ? (repeatPatients / patientsWithAppts) * 100 : 0
  const totalApptsInWindow = patientsWithMultiple.reduce((s, p) => s + p.appointments.length, 0)
  const avgVisitsPerPatient = patientsWithAppts > 0 ? totalApptsInWindow / patientsWithAppts : 0

  // ── Avg Booking Lead Time (createdAt -> start) last 30 days ─
  const recentBooked = await db.appointment.findMany({
    where: { clinicId, createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, start: true },
    take: 1000,
  })
  let totalLeadHrs = 0
  let leadCount = 0
  for (const a of recentBooked) {
    const leadMs = a.start.getTime() - a.createdAt.getTime()
    if (leadMs >= 0) {
      totalLeadHrs += leadMs / 3600000
      leadCount++
    }
  }
  const avgBookingLeadHrs = leadCount > 0 ? Math.round((totalLeadHrs / leadCount) * 10) / 10 : 0

  return ok({
    overview: {
      totalAppointments,
      completedAppointments,
      noShowRate: Math.round(noShowRate * 10) / 10,
      avgRating: Math.round((feedbackAgg._avg.rating || 0) * 10) / 10,
      totalRevenue: feeAgg._sum.totalFee || 0,
      activePatients,
      churnRate: Math.round(churnRate * 10) / 10,
      avgWaitMins,
    },
    revenueForecast,
    churnData,
    peakHours,
    doctorBenchmarks,
    patientCohorts,
    weekdayDistribution,
    serviceMix,
    appointmentTypeMix,
    repeatPatientRate: Math.round(repeatPatientRate * 10) / 10,
    avgVisitsPerPatient: Math.round(avgVisitsPerPatient * 10) / 10,
    avgBookingLeadHrs,
  })
}

export const GET = handle(advancedClinicAnalytics)
