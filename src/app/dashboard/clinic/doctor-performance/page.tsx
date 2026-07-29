import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { DoctorPerformanceClient } from './doctor-performance-client'

export const metadata = { title: 'Doctor Performance — ClinicAI' }

export default async function DoctorPerformancePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true },
  })
  if (!clinic) redirect('/login')

  // Fetch all doctors with their feedback + appointment stats
  const doctors = await db.doctor.findMany({
    where: { clinicId, active: true },
    select: {
      id: true,
      name: true,
      speciality: true,
      gender: true,
      currentStatus: true,
      _count: { select: { appointments: true } },
    },
    orderBy: { name: 'asc' },
  })

  // Fetch all feedback for this clinic (with doctor + date for trend)
  const allFeedback = await db.appointmentFeedback.findMany({
    where: { clinicId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      doctorId: true,
      rating: true,
      waitTimeMins: true,
      tags: true,
      comment: true,
      createdAt: true,
      appointmentId: true,
    },
  })

  // Fetch appointment counts by doctor + status (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentAppts = await db.appointment.findMany({
    where: { clinicId, start: { gte: thirtyDaysAgo } },
    select: { doctorId: true, status: true, start: true },
  })

  // Serialize for client
  const serializedDoctors = doctors.map((d) => {
    const docFeedback = allFeedback.filter((f) => f.doctorId === d.id)
    const totalReviews = docFeedback.length
    const avgRating = totalReviews > 0 ? docFeedback.reduce((s, f) => s + f.rating, 0) / totalReviews : 0
    const avgWait = totalReviews > 0
      ? docFeedback.reduce((s, f) => s + (f.waitTimeMins ?? 0), 0) / totalReviews
      : 0

    // Rating distribution
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const f of docFeedback) dist[f.rating] = (dist[f.rating] || 0) + 1

    // Tag frequency
    const tagCounts: Record<string, number> = {}
    for (const f of docFeedback) {
      try {
        const tags = JSON.parse(f.tags || '[]') as string[]
        for (const t of tags) tagCounts[t] = (tagCounts[t] || 0) + 1
      } catch { /* ignore */ }
    }

    // Last 30-day appointment stats
    const docAppts = recentAppts.filter((a) => a.doctorId === d.id)
    const completed30 = docAppts.filter((a) => a.status === 'completed').length
    const noShow30 = docAppts.filter((a) => a.status === 'no_show' || a.status === 'late_no_show').length
    const cancelled30 = docAppts.filter((a) => a.status === 'cancelled').length
    const total30 = docAppts.length

    // Build 30-day rating trend (avg rating per day, or null if no feedback that day)
    const trend: { date: string; avg: number | null; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStr = day.toISOString().slice(0, 10)
      const dayFeedback = docFeedback.filter((f) => f.createdAt.toISOString().slice(0, 10) === dayStr)
      if (dayFeedback.length > 0) {
        const avg = dayFeedback.reduce((s, f) => s + f.rating, 0) / dayFeedback.length
        trend.push({ date: dayStr, avg: Number(avg.toFixed(2)), count: dayFeedback.length })
      } else {
        trend.push({ date: dayStr, avg: null, count: 0 })
      }
    }

    // Recent comments (last 3)
    const recentComments = docFeedback
      .slice()
      .reverse()
      .filter((f) => f.comment)
      .slice(0, 3)
      .map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment!,
        createdAt: f.createdAt.toISOString(),
      }))

    return {
      id: d.id,
      name: d.name,
      speciality: d.speciality,
      gender: d.gender,
      currentStatus: d.currentStatus,
      totalAppointments: d._count.appointments,
      totalReviews,
      avgRating: Number(avgRating.toFixed(2)),
      avgWaitMins: Number(avgWait.toFixed(0)),
      ratingDistribution: dist,
      tagCounts,
      appts30Day: { total: total30, completed: completed30, noShow: noShow30, cancelled: cancelled30 },
      ratingTrend30Day: trend,
      recentComments,
    }
  })

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <DoctorPerformanceClient doctors={serializedDoctors} />
    </DashboardShell>
  )
}
