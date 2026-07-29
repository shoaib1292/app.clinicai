import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db + notifications + store so we exercise logic without a live DB / Brevo.
const mockPatients: any[] = []
const emailCalls: any[] = []
const storeState: Record<string, { value: any; expiresAt: number | null }> = {}

vi.mock('../db', () => ({
  db: {
    clinic: { findUnique: vi.fn(async () => ({ id: 'c1', name: 'Test Clinic', agentName: 'Sana' })) },
    appointment: {
      findMany: vi.fn(async (args: any) => {
        const gte = args?.where?.start?.gte
        return mockPatients.filter((p: any) => !gte || p.start >= gte)
      }),
    },
  },
}))

vi.mock('../notifications', () => ({
  sendEmail: vi.fn(async (to: string, subject: string, body: string) => {
    emailCalls.push({ to, subject })
    return { ok: true, messageId: 'test_1' }
  }),
}))

// Simple in-memory setNx matching the store contract used by emergency-email.
vi.mock('../store', () => ({
  store: {
    async setNx(key: string, value: any, ttl?: number) {
      const existing = storeState[key]
      if (existing && (!existing.expiresAt || existing.expiresAt > Date.now())) return false
      storeState[key] = { value, expiresAt: ttl ? Date.now() + ttl * 1000 : null }
      return true
    },
  },
}))

const { sendEmergencyEmailToPatients } = await import('../emergency-email')

describe('sendEmergencyEmailToPatients (clinic-side bulk, email only)', () => {
  beforeEach(() => {
    mockPatients.length = 0
    emailCalls.length = 0
    for (const k of Object.keys(storeState)) delete storeState[k]
  })

  it('sends email only to booked patients WITH an email', async () => {
    mockPatients.push(
      { patient: { name: 'Ali', email: 'ali@x.com' }, doctor: { name: 'Dr. Khan' }, start: new Date(Date.now() + 86400000) },
      { patient: { name: 'Sara', email: null }, doctor: { name: 'Dr. Khan' }, start: new Date(Date.now() + 86400000) },
    )
    const r = await sendEmergencyEmailToPatients('c1', 'Doctor unavailable today')
    expect(r.targeted).toBe(2)
    expect(r.sent).toBe(1) // only Ali has email
    expect(r.skippedNoEmail).toBe(1)
    expect(emailCalls[0].to).toBe('ali@x.com')
  })

  it('does NOT email past/cancelled appointments (operational, not marketing)', async () => {
    mockPatients.push(
      { patient: { name: 'Old', email: 'old@x.com' }, doctor: { name: 'Dr. X' }, start: new Date(Date.now() - 86400000) },
    )
    const r = await sendEmergencyEmailToPatients('c1', 'test')
    expect(r.targeted).toBe(0) // past start excluded by query
    expect(r.sent).toBe(0)
  })

  it('rate-limits to ONE emergency email per clinic per 24h (no abuse)', async () => {
    mockPatients.push(
      { patient: { name: 'Ali', email: 'ali@x.com' }, doctor: { name: 'Dr. Khan' }, start: new Date(Date.now() + 86400000) },
    )
    const first = await sendEmergencyEmailToPatients('c1', 'First emergency')
    expect(first.sent).toBe(1)
    expect(first.rateLimited).toBeFalsy()
    // Second call inside cooldown window → blocked, no extra emails sent.
    const second = await sendEmergencyEmailToPatients('c1', 'Second (should be blocked)')
    expect(second.rateLimited).toBe(true)
    expect(second.sent).toBe(0)
    expect(emailCalls.length).toBe(1) // still only 1 email went out
  })
})
