/**
 * LEARNED MEMORY — the agent's "long-term brain" (cost-optimized).
 *
 * Design goals (per founder requirement: smart + cheap, keys are platform's):
 *  1. Persisted per-patient insight string (<=500 chars). Written ONCE per
 *     patient per day by the nightly self-learning loop (src/lib/agent/self-learning.ts),
 *     NOT on every message. So runtime cost = 1 cheap DB read + ~1-2 lines of
 *     injected text per message. Near-zero extra tokens.
 *  2. Structured `riskSignals` + `noShowRisk` are computed by a FREE rule-based
 *     function (no-show-risk.ts) — no LLM needed at runtime.
 *  3. Runtime injection builds a compact MEMORY block the LLM sees. We never dump
 *     raw chat history; we feed the compressed insight + the risk score.
 *
 * This is what lets one shared platform agent feel like it "knows" every
 * patient personally while keeping per-message LLM cost flat.
 */

import { db } from '../db'

export interface RiskSignals {
  noShowCount: number
  noShowRate: number // 0..1 over last 90d
  lastNoShowDaysAgo: number | null
  preferredSlot: string | null // 'morning' | 'afternoon' | 'evening' | null
  language: string | null // 'urdu' | 'english' | 'roman-urdu'
  modality: string | null // 'text' | 'voice'
  prepayRequired: boolean
}

export interface PatientMemoryRecord {
  patientId: string
  clinicId: string
  insight: string
  riskSignals: RiskSignals
  noShowRisk: number // 0..100
}

/**
 * Build the compact MEMORY block injected into the system prompt at runtime.
 * Returns '' if no memory yet (new patient) — zero token waste.
 */
export function buildMemoryBlock(mem: PatientMemoryRecord | null): string {
  if (!mem) return ''
  const parts: string[] = []
  if (mem.insight && mem.insight.trim().length > 0) {
    parts.push(`PATIENT MEMORY (learned): ${mem.insight.trim()}`)
  }
  if (mem.noShowRisk >= 50) {
    parts.push(
      `RISK: high no-show probability (${mem.noShowRisk}/100). ` +
        `Send an extra reminder and confirm the day before. ` +
        (mem.riskSignals.prepayRequired ? 'Prepayment may be required.' : ''),
    )
  } else if (mem.noShowRisk >= 25) {
    parts.push(`RISK: moderate no-show probability (${mem.noShowRisk}/100). Send the standard reminders.`)
  }
  if (parts.length === 0) return ''
  return `\n\n${parts.join('\n')}`
}

/**
 * Cheap read of a patient's learned memory. Returns null if none yet.
 * This is the ONLY memory lookup per message — no extra LLM calls.
 */
export async function getPatientMemory(
  clinicId: string,
  patientId: string,
): Promise<PatientMemoryRecord | null> {
  try {
    const row = await db.patientMemory.findUnique({
      where: { clinicId_patientId: { clinicId, patientId } },
    })
    if (!row) return null
    return {
      patientId: row.patientId,
      clinicId: row.clinicId,
      insight: row.insight,
      riskSignals: (typeof row.riskSignals === 'object' && row.riskSignals
        ? (row.riskSignals as RiskSignals)
        : {} as RiskSignals),
      noShowRisk: row.noShowRisk,
    }
  } catch (err) {
    // Table may not exist yet on fresh DBs before migration — fail soft.
    console.error('[learned-memory] read failed (table may be missing):', err)
    return null
  }
}

/**
 * Upsert a patient's learned memory. Called by the nightly learning loop only.
 */
export async function savePatientMemory(
  clinicId: string,
  patientId: string,
  insight: string,
  riskSignals: RiskSignals,
  noShowRisk: number,
): Promise<void> {
  const insightTrim = insight.slice(0, 500)
  await db.patientMemory.upsert({
    where: { clinicId_patientId: { clinicId, patientId } },
    create: {
      clinicId,
      patientId,
      insight: insightTrim,
      riskSignals: riskSignals as object,
      noShowRisk,
    },
    update: {
      insight: insightTrim,
      riskSignals: riskSignals as object,
      noShowRisk,
      lastLearnedAt: new Date(),
    },
  })
}

export async function getClinicLearning(clinicId: string, date: string): Promise<string> {
  try {
    const row = await db.clinicLearning.findUnique({
      where: { clinicId_date: { clinicId, date } },
    })
    return row?.learning || ''
  } catch (err) {
    console.error('[learned-memory] clinic learning read failed:', err)
    return ''
  }
}
