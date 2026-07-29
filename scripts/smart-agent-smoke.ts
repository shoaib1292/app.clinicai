/**
 * Runtime smoke test for the Smart Agent modules.
 * Run: npx tsx scripts/smart-agent-smoke.ts
 * Proves the cost-optimized brain executes without a live LLM for the
 * risk + memory paths (self-learning is guarded so it won't burn keys here).
 */
import { computeNoShowRisk, buildReminderSchedule } from '../src/lib/agent/no-show-risk'
import { buildMemoryBlock } from '../src/lib/agent/learned-memory'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('PASS:', msg)
}

// 1) Risk engine — high risk after 2 recent no-shows
const high = computeNoShowRisk(
  { noShowCount: 2, totalVisits: 6 },
  [
    { status: 'no_show', start: daysAgo(4) },
    { status: 'no_show', start: daysAgo(15) },
    { status: 'completed', start: daysAgo(40) },
  ],
)
assert(high.score >= 50, `high-risk score >=50 (got ${high.score})`)
assert(high.plan.prepayNudge === true, 'high-risk triggers prepay nudge')
const sched = buildReminderSchedule(high.plan, new Date(Date.now() + 48 * 3_600_000))
assert(sched.some((s) => s.type === 'reminder_1d_prepay'), 'high-risk schedule includes 1d prepay reminder')

// 2) Risk engine — clean history = 0
const clean = computeNoShowRisk(
  { noShowCount: 0, totalVisits: 4 },
  [{ status: 'completed', start: daysAgo(10) }],
)
assert(clean.score === 0, 'clean history scores 0')
assert(clean.plan.prepayNudge === false, 'clean history no prepay nudge')

// 3) Memory block injection (cheap, no DB/LLM)
const memBlock = buildMemoryBlock({
  patientId: 'p1', clinicId: 'c1',
  insight: 'Prefers Urdu voice; wife Ayesha books for him.',
  riskSignals: { noShowCount: 2, noShowRate: 0.5, lastNoShowDaysAgo: 4, preferredSlot: 'morning', language: 'urdu', modality: 'voice', prepayRequired: true },
  noShowRisk: 70,
})
assert(memBlock.includes('PATIENT MEMORY') && memBlock.includes('high no-show probability (70/100)'), 'memory block injects insight + risk warning')
assert(buildMemoryBlock(null) === '', 'null memory -> empty block (zero tokens)')

console.log('\nSMART AGENT SMOKE TEST: ALL GREEN ✅')
