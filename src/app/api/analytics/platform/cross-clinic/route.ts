import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

// GET /api/analytics/platform/cross-clinic
// Returns cross-clinic comparison data for platform admin
async function crossClinicAnalytics(_req: NextRequest) {
  await requireScope('analytics:read')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Get all clinics with key metrics
  const clinics = await db.clinic.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      status: true,
      creditBalance: true,
      agentEnabled: true,
      createdAt: true,
    },
  })

  // For each clinic, gather appointment metrics in last 30 days
  const clinicStats = await Promise.all(
    clinics.map(async (clinic) => {
      const [totalAppts, completedAppts, noShowAppts, cancelledAppts, activePatients, totalRevenue] = await Promise.all([
        db.appointment.count({ where: { clinicId: clinic.id, createdAt: { gte: thirtyDaysAgo } } }),
        db.appointment.count({ where: { clinicId: clinic.id, createdAt: { gte: thirtyDaysAgo }, status: 'completed' } }),
        db.appointment.count({ where: { clinicId: clinic.id, createdAt: { gte: thirtyDaysAgo }, status: 'no_show' } }),
        db.appointment.count({ where: { clinicId: clinic.id, createdAt: { gte: thirtyDaysAgo }, status: 'cancelled' } }),
        db.patient.count({
          where: { clinicId: clinic.id, appointments: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        }),
        db.appointment.aggregate({
          where: { clinicId: clinic.id, createdAt: { gte: thirtyDaysAgo }, status: 'completed' },
          _sum: { totalFee: true },
        }),
      ])

      const completionRate = totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0
      const noShowRate = totalAppts > 0 ? Math.round((noShowAppts / totalAppts) * 100) : 0

      return {
        clinicId: clinic.id,
        clinicName: clinic.name,
        city: clinic.city || 'Unknown',
        status: clinic.status,
        creditBalance: clinic.creditBalance,
        agentEnabled: clinic.agentEnabled,
        activeSince: clinic.createdAt,
        appointments: totalAppts,
        completedAppts,
        noShowAppts,
        cancelledAppts,
        activePatients,
        completionRate,
        noShowRate,
        revenue: totalRevenue._sum.totalFee || 0,
      }
    }),
  )

  // Sort by revenue for rankings
  const byRevenue = [...clinicStats].sort((a, b) => b.revenue - a.revenue)
  const byAppointments = [...clinicStats].sort((a, b) => b.appointments - a.appointments)
  const byCompletion = [...clinicStats].sort((a, b) => b.completionRate - a.completionRate)
  const byNoShow = [...clinicStats].sort((a, b) => b.noShowRate - a.noShowRate)

  // Aggregate totals
  const totalAppointments = clinicStats.reduce((s, c) => s + c.appointments, 0)
  const totalRevenue = clinicStats.reduce((s, c) => s + c.revenue, 0)
  const totalPatients = clinicStats.reduce((s, c) => s + c.activePatients, 0)
  const avgCompletionRate = clinicStats.length > 0
    ? Math.round(clinicStats.reduce((s, c) => s + c.completionRate, 0) / clinicStats.length)
    : 0

  // City breakdown
  const cityMap = new Map<string, { clinics: number; appointments: number; revenue: number }>()
  for (const c of clinicStats) {
    const city = c.city
    const existing = cityMap.get(city) || { clinics: 0, appointments: 0, revenue: 0 }
    existing.clinics++
    existing.appointments += c.appointments
    existing.revenue += c.revenue
    cityMap.set(city, existing)
  }
  const cityBreakdown = Array.from(cityMap.entries()).map(([city, data]) => ({
    city,
    ...data,
  })).sort((a, b) => b.revenue - a.revenue)

  // Top 5 and bottom 5 by revenue
  const top5ByRevenue = byRevenue.slice(0, 5)
  const bottom5ByRevenue = byRevenue.filter((c) => c.revenue > 0).slice(-5).reverse()

  return ok({
    summary: {
      totalClinics: clinics.length,
      activeClinics: clinics.filter((c) => c.status === 'active').length,
      totalAppointments,
      totalRevenue,
      totalActivePatients: totalPatients,
      avgCompletionRate,
    },
    clinicRankings: {
      byRevenue: top5ByRevenue,
      byAppointments: byAppointments.slice(0, 5),
      byCompletion: byCompletion.slice(0, 5),
      byNoShow: byNoShow.slice(0, 5), // Highest no-show rates
      needsAttention: bottom5ByRevenue,
    },
    cityBreakdown,
    allClinicStats: clinicStats.sort((a, b) => b.appointments - a.appointments),
  })
}

export const GET = handle(crossClinicAnalytics)
