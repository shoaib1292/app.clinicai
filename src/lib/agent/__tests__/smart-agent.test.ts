import { describe, it, expect } from 'vitest'
import { computeNoShowRisk, buildReminderSchedule } from '../no-show-risk'
import { buildMemoryBlock } from '../learned-memory'

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)
const hrsAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000)

describe('computeNoShowRisk (free, rule-based)', () => {
  it('scores 0 for a patient with clean history', () => {
    const r = computeNoShowRisk(
      { noShowCount: 0, totalVisits: 5 },
      [
        { status: 'completed', start: daysAgo(10) },
        { status: 'completed', start: daysAgo(40) },
      ],
    )
    expect(r.score).toBe(0)
    expect(r.plan.offsets).toEqual(['reminder_24h', 'reminder_2h', 'reminder_30min'])
    expect(r.plan.prepayNudge).toBe(false)
  })

  it('flags high risk + prepay nudge after 2 recent no-shows', () => {
    const r = computeNoShowRisk(
      { noShowCount: 2, totalVisits: 6 },
      [
        { status: 'no_show', start: daysAgo(5) },
        { status: 'no_show', start: daysAgo(20) },
        { status: 'completed', start: daysAgo(60) },
      ],
    )
    expect(r.score).toBeGreaterThanOrEqual(50)
    expect(r.plan.prepayNudge).toBe(true)
    expect(r.plan.offsets).toContain('reminder_1d_prepay')
  })

  it('detects preferred morning slot from shown appointments', () => {
    const r = computeNoShowRisk(
      { noShowCount: 0, totalVisits: 3 },
      [
        { status: 'completed', start: new Date(hrsAgo(2).setHours(9, 0, 0, 0)) },
        { status: 'completed', start: new Date(hrsAgo(50).setHours(10, 0, 0, 0)) },
      ],
    )
    expect(r.signals.preferredSlot).toBe('morning')
  })

  it('treats brand-new patient as low neutral risk', () => {
    const r = computeNoShowRisk(
      { noShowCount: 0, totalVisits: 0 },
      [],
    )
    expect(r.score).toBe(10)
  })
})

describe('buildReminderSchedule', () => {
  it('schedules only the single 30-min reminder regardless of risk', () => {
    const r = computeNoShowRisk(
      { noShowCount: 2, totalVisits: 4 },
      [
        { status: 'no_show', start: daysAgo(3) },
        { status: 'no_show', start: daysAgo(20) },
      ],
    )
    const sched = buildReminderSchedule(r.plan, new Date(Date.now() + 48 * 3600 * 1000))
    const types = sched.map((s) => s.type)
    expect(r.score).toBeGreaterThanOrEqual(50)
    // Founder decision: single 30-min reminder only (reduce WA volume / ban risk).
    expect(types).toEqual(['reminder_30min'])
    // High-risk flag still drives the payment nudge elsewhere.
    expect(r.plan.prepayNudge).toBe(true)
  })
})

describe('buildMemoryBlock (cheap injection)', () => {
  it('returns empty string when no memory', () => {
    expect(buildMemoryBlock(null)).toBe('')
  })

  it('includes insight + high-risk warning', () => {
    const block = buildMemoryBlock({
      patientId: 'p1',
      clinicId: 'c1',
      insight: 'Prefers Urdu voice; wife Ayesha books for him.',
      riskSignals: { noShowCount: 2, noShowRate: 0.5, lastNoShowDaysAgo: 5, preferredSlot: 'morning', language: 'urdu', modality: 'voice', prepayRequired: true },
      noShowRisk: 70,
    })
    expect(block).toContain('PATIENT MEMORY')
    expect(block).toContain('Prefers Urdu voice')
    expect(block).toContain('high no-show probability (70/100)')
  })

  it('omits risk line for low-risk patients', () => {
    const block = buildMemoryBlock({
      patientId: 'p2',
      clinicId: 'c1',
      insight: 'Likes evening slots.',
      riskSignals: { noShowCount: 0, noShowRate: 0, lastNoShowDaysAgo: null, preferredSlot: 'evening', language: 'english', modality: 'text', prepayRequired: false },
      noShowRisk: 0,
    })
    expect(block).not.toContain('RISK:')
  })
})
