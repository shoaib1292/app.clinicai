/**
 * Analytics Rollup Jobs (Founder Doc §32)
 * Nightly job that computes analytics snapshots from the day's data.
 * Stores results in AnalyticsSnapshot table for fast dashboard queries.
 */
import { db } from './db'

/**
 * Run the nightly analytics rollup for a specific clinic + date.
 * Computes: appointment counts by status, revenue, no-show rate, new patients,
 * active conversations, feedback stats.
 */
export async function rollupClinicAnalytics(clinicId: string, date: Date): Promise<{ snapshotId: string }> {
  const dayStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

  // Fetch all data for the day
  const [appointments, newPatients, conversations, feedback] = await Promise.all([
    db.appointment.findMany({
      where: { clinicId, start: { gte: dayStart, lt: dayEnd } },
      select: { status: true, totalFee: true, paymentMode: true, channel: true, doctorId: true },
    }),
    db.patient.count({
      where: { clinicId, createdAt: { gte: dayStart, lt: dayEnd } },
    }),
    db.conversation.count({
      where: { clinicId, updatedAt: { gte: dayStart, lt: dayEnd } },
    }),
    db.appointmentFeedback.findMany({
      where: { clinicId, createdAt: { gte: dayStart, lt: dayEnd } },
      select: { rating: true, waitTimeMins: true },
    }),
  ])

  // Compute metrics
  const total = appointments.length
  const completed = appointments.filter((a) => a.status === 'completed').length
  const noShow = appointments.filter((a) => a.status === 'no_show' || a.status === 'late_no_show').length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length
  const booked = appointments.filter((a) => a.status === 'booked' || a.status === 'confirmed').length
  const revenue = appointments
    .filter((a) => ['completed', 'booked', 'confirmed'].includes(a.status))
    .reduce((s, a) => s + a.totalFee, 0)
  const onlinePayments = appointments.filter((a) => a.paymentMode === 'online').length
  const cashPayments = appointments.filter((a) => a.paymentMode === 'cash').length
  const whatsappBookings = appointments.filter((a) => a.channel === 'whatsapp').length
  const manualBookings = appointments.filter((a) => a.channel === 'manual').length
  const linkBookings = appointments.filter((a) => a.channel === 'link').length

  const noShowRate = total > 0 ? Number(((noShow / total) * 100).toFixed(2)) : 0
  const avgRating = feedback.length > 0 ? Number((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(2)) : 0
  const avgWait = feedback.length > 0 ? Math.round(feedback.reduce((s, f) => s + (f.waitTimeMins ?? 0), 0) / feedback.length) : 0

  const metrics = {
    date: dayStart.toISOString().slice(0, 10),
    appointments: { total, completed, noShow, cancelled, booked },
    revenue,
    payments: { online: onlinePayments, cash: cashPayments },
    channels: { whatsapp: whatsappBookings, manual: manualBookings, link: linkBookings },
    noShowRate,
    newPatients,
    activeConversations: conversations,
    feedback: { count: feedback.length, avgRating, avgWaitMins: avgWait },
  }

  // Upsert the snapshot (one per clinic per day)
  const existing = await db.analyticsSnapshot.findFirst({
    where: { clinicId, date: dayStart },
  })

  let snapshotId: string
  if (existing) {
    await db.analyticsSnapshot.update({
      where: { id: existing.id },
      data: { metrics: JSON.stringify(metrics) },
    })
    snapshotId = existing.id
  } else {
    const snapshot = await db.analyticsSnapshot.create({
      data: {
        clinicId,
        date: dayStart,
        metrics: JSON.stringify(metrics),
      },
    })
    snapshotId = snapshot.id
  }

  return { snapshotId }
}

/**
 * Run rollup for all active clinics for a given date.
 * Called by the nightly cron job.
 */
export async function rollupAllClinics(date: Date): Promise<{ clinics: number; snapshots: number }> {
  const clinics = await db.clinic.findMany({
    where: { status: 'active' },
    select: { id: true },
  })

  let snapshots = 0
  for (const clinic of clinics) {
    try {
      await rollupClinicAnalytics(clinic.id, date)
      snapshots++
    } catch (err) {
      console.error(`[rollup] Failed for clinic ${clinic.id}:`, err)
    }
  }

  return { clinics: clinics.length, snapshots }
}

/**
 * Run rollup for the previous day (typical cron usage).
 */
export async function runNightlyRollup(): Promise<{ clinics: number; snapshots: number }> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return rollupAllClinics(yesterday)
}
