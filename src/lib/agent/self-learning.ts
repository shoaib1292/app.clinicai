/**
 * SELF-LEARNING LOOP — nightly, cost-optimized (nano model, 1 call/patient/day).
 *
 * This is the "self-learning" brain. It runs ONCE per night (cron) — NOT on
 * every message — so per-message LLM cost stays flat while the agent still
 * "learns" from outcomes:
 *
 *   1. For each active patient with recent activity, compress today's
 *      conversation + appointment outcomes into a <=500-char `insight` string
 *      using the CHEAPEST available model (gpt-4.1-nano / equivalent).
 *   2. Recompute the free rule-based no-show risk and merge it.
 *   3. Per clinic, aggregate the day's outcomes into a `ClinicLearning` row
 *      ("what actually worked today") using one nano call.
 *
 * Runtime (per message) only reads the persisted insight — no LLM. That is the
 * whole cost trick: learn cheaply & rarely, recall for free.
 */

import { db } from '../db'
import { computeNoShowRisk } from './no-show-risk'
import {
  savePatientMemory,
  getPatientMemory,
  type RiskSignals,
} from './learned-memory'
import { createChatCompletion } from './chat'

const NANO_MODEL_HINT = 'gpt-4.1-nano' // cheapest; provider may map to its nano

interface DayOutcome {
  patientId: string
  clinicId: string
  appointments: Array<{ status: string; start: Date; doctorName?: string }>
  lastMessage?: string
}

function isoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

async function cheapCompressInsight(
  clinicId: string,
  patientId: string,
  priorInsight: string,
  dayText: string,
): Promise<string> {
  const prompt = `You are a memory compressor for a clinic WhatsApp receptionist.
Given the patient's PRIOR learned memory and TODAY's new activity, produce a single
compact "memory" string (MAX 400 characters, no markdown, plain text) that a receptionist
can use to personalize future chats. Include only durable, useful facts:
- preferred language / voice vs text
- preferred slot time (morning/afternoon/evening) if clear
- fears or needs (e.g. "scared of injections", "needs extra reminder")
- family members who book for them
- no-show tendency and what helped
Drop transient details. If nothing new, return the prior memory trimmed.

PRIOR MEMORY:
${priorInsight || '(none)'}

TODAY'S ACTIVITY:
${dayText || '(none)'}

Return ONLY the compact memory string.`

  try {
    const res = await createChatCompletion({
      model: NANO_MODEL_HINT,
      messages: [
        { role: 'system', content: 'Compress to <=400 chars. Plain text. No preamble.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 160,
    })
    const out = res.choices[0]?.message?.content?.trim() || priorInsight
    return out.slice(0, 500)
  } catch (err) {
    console.error('[self-learning] compress failed:', err)
    return priorInsight
  }
}

async function learnPatientDay(outcome: DayOutcome): Promise<void> {
  const patient = await db.patient.findUnique({
    where: { id: outcome.patientId },
    include: {
      appointments: {
        orderBy: { start: 'desc' },
        take: 20,
        include: { doctor: true },
      },
    },
  })
  if (!patient) return

  const risk = computeNoShowRisk(
    { noShowCount: patient.noShowCount, totalVisits: patient.totalVisits },
    patient.appointments.map((a) => ({ status: a.status, start: a.start })),
  )

  const prior = await getPatientMemory(outcome.clinicId, outcome.patientId)
  const dayText =
    outcome.appointments
      .map((a) => `- ${a.start.toISOString().slice(0, 10)} ${a.status} (Dr. ${a.doctorName || '?'})`)
      .join('\n') + (outcome.lastMessage ? `\n- last msg: ${outcome.lastMessage.slice(0, 120)}` : '')

  const signals: RiskSignals = {
    ...risk.signals,
    language: patient.preferredLanguage || null,
    modality: patient.preferredModality || null,
  }

  let insight = prior?.insight || ''
  // Only spend an LLM call if there is something new today.
  if (dayText.trim().length > 0) {
    insight = await cheapCompressInsight(outcome.clinicId, outcome.patientId, prior?.insight || '', dayText)
  }

  await savePatientMemory(outcome.clinicId, outcome.patientId, insight, signals, risk.score)
}

async function learnClinicDay(clinicId: string, date: string): Promise<void> {
  const start = new Date(date + 'T00:00:00Z')
  const end = new Date(date + 'T23:59:59Z')

  const appts = await db.appointment.findMany({
    where: { clinicId, start: { gte: start, lte: end } },
    select: { status: true, channel: true },
  })
  const bookings = appts.length
  const shows = appts.filter((a) => ['completed', 'confirmed', 'booked'].includes(a.status)).length
  const noShows = appts.filter((a) => a.status === 'no_show' || a.status === 'late_no_show').length

  const metrics = { bookingsToday: bookings, shows, noShows }

  const prompt = `Clinic daily learning. Summarize in <=300 chars what worked today for a WhatsApp
AI receptionist to improve bookings and reduce no-shows. Use the numbers.
Bookings: ${bookings}, Shows: ${shows}, No-shows: ${noShows}.
If no-shows > 0, suggest a concrete counter (e.g. extra reminder, prepay nudge, confirm-a-call).
If bookings high, note the best channel/slot if inferable. Plain text, no markdown.`

  let learning = ''
  try {
    const res = await createChatCompletion({
      model: NANO_MODEL_HINT,
      messages: [
        { role: 'system', content: 'Concise clinic learning. <=300 chars. Plain text.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 120,
    })
    learning = (res.choices[0]?.message?.content?.trim() || '').slice(0, 1500)
  } catch (err) {
    console.error('[self-learning] clinic learn failed:', err)
  }

  await db.clinicLearning.upsert({
    where: { clinicId_date: { clinicId, date } },
    create: { clinicId, date, learning, metrics: metrics as object },
    update: { learning, metrics: metrics as object },
  })
}

/**
 * Run the full nightly self-learning pass for one clinic.
 * Costs: ~1 nano call per active patient + 1 per clinic. Very cheap.
 */
export async function runClinicLearning(clinicId: string, date = isoDate()): Promise<{ patients: number }> {
  const start = new Date(date + 'T00:00:00Z')
  const end = new Date(date + 'T23:59:59Z')

  const activePatients = await db.patient.findMany({
    where: {
      clinicId,
      appointments: { some: { start: { gte: start, lte: end } } },
    },
    select: { id: true },
  })

  for (const p of activePatients) {
    const appts = await db.appointment.findMany({
      where: { clinicId, patientId: p.id, start: { gte: start, lte: end } },
      include: { doctor: true },
    })
    const lastConv = await db.conversation.findFirst({
      where: { clinicId, patientId: p.id, updatedAt: { gte: start } },
      orderBy: { updatedAt: 'desc' },
      select: { summary: true },
    })
    await learnPatientDay({
      patientId: p.id,
      clinicId,
      appointments: appts.map((a) => ({ status: a.status, start: a.start, doctorName: a.doctor?.name })),
      lastMessage: lastConv?.summary || undefined,
    })
  }

  await learnClinicDay(clinicId, date)
  return { patients: activePatients.length }
}

/**
 * Run learning for all active clinics (called by cron).
 */
export async function runAllClinicLearning(): Promise<{ clinics: number; patients: number }> {
  const clinics = await db.clinic.findMany({
    where: { status: 'active', agentEnabled: true },
    select: { id: true },
  })
  let patients = 0
  for (const c of clinics) {
    try {
      const r = await runClinicLearning(c.id)
      patients += r.patients
    } catch (err) {
      console.error(`[self-learning] clinic ${c.id} failed:`, err)
    }
  }
  return { clinics: clinics.length, patients }
}
