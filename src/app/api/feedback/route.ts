import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { getSession } from '@/lib/session'

// List feedback for a clinic (with optional doctor filter)
async function listFeedback(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)

  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200)

  const where: { clinicId: string; doctorId?: string } = { clinicId: session.clinicId }
  if (doctorId) where.doctorId = doctorId

  const feedback = await db.appointmentFeedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true, speciality: true } },
      appointment: { select: { id: true, start: true, service: { select: { name: true } } } },
    },
  })

  // Compute aggregate stats
  const all = await db.appointmentFeedback.findMany({
    where: { clinicId: session.clinicId },
    select: { rating: true, waitTimeMins: true, tags: true, doctorId: true },
  })

  const total = all.length
  const avgRating = total > 0 ? all.reduce((s, f) => s + f.rating, 0) / total : 0
  const avgWait = total > 0 ? all.reduce((s, f) => s + (f.waitTimeMins ?? 0), 0) / total : 0
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const f of all) ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1

  // Tag frequency
  const tagCounts: Record<string, number> = {}
  for (const f of all) {
    try {
      const tags = JSON.parse(f.tags || '[]') as string[]
      for (const t of tags) tagCounts[t] = (tagCounts[t] || 0) + 1
    } catch { /* ignore */ }
  }

  // Per-doctor aggregates
  const perDoctor: Record<string, { count: number; sum: number }> = {}
  for (const f of all) {
    if (!perDoctor[f.doctorId]) perDoctor[f.doctorId] = { count: 0, sum: 0 }
    perDoctor[f.doctorId].count++
    perDoctor[f.doctorId].sum += f.rating
  }

  return ok({
    feedback,
    stats: {
      total,
      avgRating: Number(avgRating.toFixed(2)),
      avgWaitMins: Number(avgWait.toFixed(0)),
      ratingDistribution,
      tagCounts,
      perDoctor,
    },
  })
}

// Create new feedback (called by patient via public link OR by staff manually)
async function createFeedback(req: NextRequest) {
  const body = (await req.json()) as {
    appointmentId: string
    rating: number
    waitTimeMins?: number
    tags?: string[]
    comment?: string
    channel?: string
  }

  if (!body.appointmentId) return err('appointmentId required', 400)
  if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
    return err('rating must be 1-5', 400)
  }

  // Find the appointment (must exist + be completed)
  const appt = await db.appointment.findUnique({
    where: { id: body.appointmentId },
    select: { id: true, clinicId: true, patientId: true, doctorId: true, status: true },
  })
  if (!appt) return err('Appointment not found', 404)
  if (appt.status !== 'completed') return err('Feedback only allowed for completed appointments', 400)

  // Check if feedback already exists (1:1 relation)
  const existing = await db.appointmentFeedback.findUnique({
    where: { appointmentId: body.appointmentId },
  })
  if (existing) return err('Feedback already submitted for this appointment', 409)

  const session = await getSession()
  // If logged-in staff is creating, verify clinic scope
  if (session && session.clinicId && session.clinicId !== appt.clinicId) {
    return err('Cross-clinic feedback not allowed', 403)
  }

  const feedback = await db.appointmentFeedback.create({
    data: {
      appointmentId: body.appointmentId,
      clinicId: appt.clinicId,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      rating: body.rating,
      waitTimeMins: body.waitTimeMins ?? null,
      tags: JSON.stringify(body.tags || []),
      comment: body.comment?.trim() || null,
      channel: body.channel || 'manual',
    },
  })

  return ok({ feedback })
}

export const GET = handle(listFeedback)
export const POST = handle(createFeedback)
