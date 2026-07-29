/**
 * NO-SHOW RISK ENGINE — rule-based, ZERO LLM cost at runtime.
 *
 * Given a patient's history, produce:
 *  - a 0..100 risk score (drives how many/which reminders to send)
 *  - structured risk signals the agent injects cheaply
 *  - an adaptive reminder plan (which reminder offsets + prepay nudge)
 *
 * Pure function of data we already have in the DB — no API calls. This is the
 * cheap counterpart to "smart": the expensive LLM only does conversation, while
 * risk + cadence decisions are free math.
 */

import type { RiskSignals } from './learned-memory'

export type ReminderOffset = 'reminder_24h' | 'reminder_2h' | 'reminder_30min' | 'reminder_1d_prepay'

export interface AdaptiveReminderPlan {
  // Which reminder types to schedule for this booking.
  offsets: ReminderOffset[]
  // Whether to send a prepayment nudge (proven to cut no-shows for risky pts).
  prepayNudge: boolean
  // Human-readable reason (for logs / clinic transparency).
  reason: string
}

export interface NoShowRiskResult {
  score: number // 0..100
  signals: RiskSignals
  plan: AdaptiveReminderPlan
}

const RISK_WINDOW_DAYS = 90

function daysAgo(d: Date | null): number | null {
  if (!d) return null
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Compute no-show risk from a patient's appointment history.
 * @param history appointments (any status) for the patient, newest first preferred.
 */
export function computeNoShowRisk(
  patient: { noShowCount: number; totalVisits: number },
  history: Array<{ status: string; start: Date }>,
): NoShowRiskResult {
  const now = Date.now()
  const cutoff = now - RISK_WINDOW_DAYS * 24 * 60 * 60 * 1000

  const recent = history.filter((a) => a.start.getTime() >= cutoff)
  const recentTotal = recent.length
  const recentNoShows = recent.filter((a) => a.status === 'no_show' || a.status === 'late_no_show').length
  const noShowRate = recentTotal > 0 ? recentNoShows / recentTotal : 0

  // days since last no-show
  const noShowDates = history
    .filter((a) => a.status === 'no_show' || a.status === 'late_no_show')
    .map((a) => a.start)
  const lastNoShow = noShowDates.length ? new Date(Math.max(...noShowDates.map((d) => d.getTime()))) : null
  const lastNoShowDaysAgo = daysAgo(lastNoShow)

  // preferred slot window from completed/shown appointments
  const shown = history.filter((a) => a.status === 'completed' || a.status === 'confirmed' || a.status === 'booked')
  let preferredSlot: RiskSignals['preferredSlot'] = null
  if (shown.length > 0) {
    const hrs = shown.map((a) => a.start.getHours())
    const avg = hrs.reduce((s, h) => s + h, 0) / hrs.length
    preferredSlot = avg < 12 ? 'morning' : avg < 17 ? 'afternoon' : 'evening'
  }

  const prepayRequired = recentNoShows >= 1

  const signals: RiskSignals = {
    noShowCount: recentNoShows,
    noShowRate,
    lastNoShowDaysAgo,
    preferredSlot,
    language: null, // filled by caller if known (patient.preferredLanguage)
    modality: null,
    prepayRequired,
  }

  // ── Score (0..100), weighted, capped ──────────────────────────────────
  let score = 0
  score += Math.min(recentNoShows, 3) * 28 // up to 84 from recent no-shows
  score += Math.round(noShowRate * 15) // up to 15 from rate
  if (lastNoShowDaysAgo !== null && lastNoShowDaysAgo < 30) score += 3 // recent pattern
  // brand-new patient with zero history = small neutral risk
  if (recentTotal === 0 && patient.totalVisits === 0) score = 10
  score = Math.max(0, Math.min(100, score))

  // ── Adaptive plan ─────────────────────────────────────────────────────
  const offsets: ReminderOffset[] = ['reminder_24h', 'reminder_2h', 'reminder_30min']
  let prepayNudge = false
  let reason = 'Standard cadence (low risk).'
  if (score >= 50) {
    offsets.push('reminder_1d_prepay')
    prepayNudge = true
    reason = `High risk (${score}/100): ${recentNoShows} no-show(s) in ${RISK_WINDOW_DAYS}d. Added prepay nudge + extra reminder.`
  } else if (score >= 25) {
    reason = `Moderate risk (${score}/100): standard cadence + closer 2h/30m reminders.`
  }

  return { score, signals, plan: { offsets, prepayNudge, reason } }
}

/**
 * Translate a risk plan into concrete reminder rows (offsets in ms before appt).
 * Founder decision: single 30-min reminder only — reduces WhatsApp volume and
 * ban risk. The prepayNudge flag (high-risk patients) still drives the payment
 * nudge elsewhere, but no extra reminder messages are scheduled here.
 */
export function buildReminderSchedule(
  plan: AdaptiveReminderPlan,
  start: Date,
): Array<{ type: string; ms: number }> {
  return [{ type: 'reminder_30min', ms: 30 * 60 * 1000 }]
}

/**
 * Lightweight risk summary for the booking flow — drives reminder consent
 * wording (Case A vs Case B) without extra LLM calls.
 */
export interface RiskSummary {
  score: number
  isHighRisk: boolean          // score >= 50
  lastIncidentType: 'no_show' | 'late' | null
  noShowCount: number
  lastNoShowDaysAgo: number | null
}

export function getRiskSummary(
  patient: { noShowCount: number; totalVisits: number },
  history: Array<{ status: string; start: Date }>,
): RiskSummary {
  const result = computeNoShowRisk(patient, history)

  const incidents = history.filter(
    (a) => a.status === 'no_show' || a.status === 'late_no_show' || a.status === 'late',
  )
  let lastIncident: (typeof incidents)[0] | null = null
  if (incidents.length > 0) {
    lastIncident = incidents.reduce((latest, a) =>
      a.start.getTime() > latest.start.getTime() ? a : latest,
    )
  }
  let lastIncidentType: 'no_show' | 'late' | null = null
  if (lastIncident) {
    const s = lastIncident.status
    lastIncidentType = s === 'late_no_show' || s === 'late' ? 'late' : 'no_show'
  }

  return {
    score: result.score,
    isHighRisk: result.score >= 50,
    lastIncidentType,
    noShowCount: result.signals.noShowCount,
    lastNoShowDaysAgo: result.signals.lastNoShowDaysAgo,
  }
}
