import { db } from './db'

// Generate slots for a doctor on a given date based on their schedule + overrides.
// queue_mode determines token assignment.
export async function generateSlotsForDoctorDate(doctorId: string, date: Date, _durationOverride?: number) {
  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    include: { schedules: true, scheduleOverrides: true },
  })
  if (!doctor) return []

  const dayOfWeek = date.getDay() // 0=Sun
  const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

  // Check for leave/block override (full day)
  const dayOverride = doctor.scheduleOverrides.find(
    (o) => sameDay(o.date, date) && o.type === 'leave'
  )
  if (dayOverride) return [] // doctor on leave

  const schedule = doctor.schedules.find((s) => s.dayOfWeek === dayOfWeek)
  if (!schedule) return []

  const duration = doctor.slotDurationMin
  const [sh, sm] = schedule.startTime.split(':').map(Number)
  const [eh, em] = schedule.endTime.split(':').map(Number)
  let cursor = sh * 60 + sm
  const endMin = eh * 60 + em

  // Parse breaks
  let breaks: { start: number; end: number }[] = []
  try {
    breaks = JSON.parse(schedule.breakWindows || '[]').map((b: { start: string; end: string }) => ({
      start: toMin(b.start),
      end: toMin(b.end),
    }))
  } catch {
    breaks = []
  }

  // Apply emergency/block time overrides for the day
  const timeOverrides = doctor.scheduleOverrides.filter(
    (o) => sameDay(o.date, date) && o.type !== 'leave'
  )
  for (const o of timeOverrides) {
    if (o.startTime && o.endTime) {
      if (o.type === 'block') {
        breaks.push({ start: toMin(o.startTime), end: toMin(o.endTime) })
      }
    }
  }

  const slots: { startTime: string; endTime: string; tokenNo: number }[] = []
  let token = 1
  while (cursor + duration <= endMin) {
    const inBreak = breaks.some((b) => cursor >= b.start && cursor < b.end)
    if (!inBreak) {
      slots.push({
        startTime: fromMin(cursor),
        endTime: fromMin(cursor + duration),
        tokenNo: token++,
      })
    }
    cursor += duration
  }

  // Persist slots (idempotent: skip if already exist for this doctor+date)
  const existing = await db.slot.findFirst({
    where: { doctorId, date: dateOnly },
  })
  if (existing) {
    return slots // already generated
  }

  await db.slot.createMany({
    data: slots.map((s) => ({
      doctorId,
      clinicId: doctor.clinicId,
      date: dateOnly,
      startTime: s.startTime,
      endTime: s.endTime,
      tokenNo: doctor.queueMode === 'time' ? null : s.tokenNo,
      status: 'open',
    })),
  })

  return slots
}

// Ensure slots exist for a doctor for next N days
export async function ensureSlots(doctorId: string, days = 14) {
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    await generateSlotsForDoctorDate(doctorId, d)
  }
}

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function fromMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

// List available slots for a doctor on a date (excluding booked/held/blocked)
export async function listAvailableSlots(doctorId: string, date: Date) {
  const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  await generateSlotsForDoctorDate(doctorId, date)
  const slots = await db.slot.findMany({
    where: {
      doctorId,
      date: dateOnly,
      status: 'open',
      holdExpiresAt: null,
    },
    orderBy: { startTime: 'asc' },
  })
  // Filter out expired holds
  const now = new Date()
  return slots.filter((s) => !s.holdExpiresAt || s.holdExpiresAt < now)
}

// Pricing: compute fees for an appointment
export function computeFees(params: {
  doctorFee: number
  clinicMarkup?: number
  platformFeeDefault?: number
  platformFeeOverride?: number | null
}) {
  const platformFee = params.platformFeeOverride ?? params.platformFeeDefault ?? 50
  const markup = params.clinicMarkup ?? 0
  const total = params.doctorFee + markup + platformFee
  return {
    doctorFee: params.doctorFee,
    clinicMarkup: markup,
    platformFee,
    total,
  }
}

// Cancellation refund policy (full if >4h, 50% if 2-4h, 0% if <2h)
export function computeRefund(appointmentStart: Date, platformFee: number): number {
  const now = new Date()
  const diffHours = (appointmentStart.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (diffHours > 4) return platformFee
  if (diffHours > 2) return Math.floor(platformFee * 0.5)
  return 0
}

/** Resolve appointment duration from a service (or doctor default). */
export async function resolveDuration(clinicId: string, doctorId: string, serviceId?: string): Promise<number | undefined> {
  if (serviceId) {
    const svc = await db.service.findFirst({ where: { id: serviceId, clinicId } })
    if (svc) return svc.durationMin
  }
  const doc = await db.doctor.findUnique({ where: { id: doctorId } })
  return doc?.slotDurationMin
}

/** Check if a slot falls within a leave or blocked time range. */
export async function findBlockingOverride(params: {
  doctorId: string
  slotDate: Date
  startTime: string
  endTime: string
}): Promise<{ type: string } | null> {
  const dayStart = new Date(Date.UTC(params.slotDate.getFullYear(), params.slotDate.getMonth(), params.slotDate.getDate()))
  const overrides = await db.scheduleOverride.findMany({
    where: {
      doctorId: params.doctorId,
      date: dayStart,
      type: { in: ['leave', 'block'] },
    },
  })
  for (const o of overrides) {
    if (o.type === 'leave') return { type: 'leave' }
    if (o.startTime && o.endTime) {
      const slotMin = toMin(params.startTime)
      const slotEndMin = toMin(params.endTime)
      const blockMin = toMin(o.startTime)
      const blockEndMin = toMin(o.endTime)
      if (slotMin < blockEndMin && slotEndMin > blockMin) return { type: 'block' }
    }
  }
  return null
}
