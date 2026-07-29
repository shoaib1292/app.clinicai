import { describe, it, expect, vi } from 'vitest'

vi.mock('../../db', () => ({
  db: {
    clinic: {
      findUnique: vi.fn(),
    },
    doctor: {
      findMany: vi.fn(),
    },
  },
}))

describe('ruleBasedFallback()', () => {
  it('should return clinic not found message when clinic is null', async () => {
    const { db } = await import('../../db')
    vi.mocked(db.clinic.findUnique).mockResolvedValue(null)

    const { ruleBasedFallback } = await import('../fallback')
    const result = await ruleBasedFallback('hello', { clinicId: 'nonexistent' })
    expect(result).toBe('Clinic not found')
  })

  it('should return booking response for booking keywords', async () => {
    const { db } = await import('../../db')
    vi.mocked(db.clinic.findUnique).mockResolvedValue({
      agentName: 'Test Agent',
      agentFallback: 'Fallback message',
    } as any)
    vi.mocked(db.doctor.findMany).mockResolvedValue([
      { name: 'Dr. Ahmad', speciality: 'General' },
    ] as any)

    const { ruleBasedFallback } = await import('../fallback')
    const result = await ruleBasedFallback('Mujhe appointment chahiye', { clinicId: 'clinic1' })
    expect(result).toContain('Test Agent')
    expect(result).toContain('Dr. Ahmad')
    expect(result.toLowerCase()).toContain('appointment')
  })

  it('should return cancel response for cancel keywords', async () => {
    const { db } = await import('../../db')
    vi.mocked(db.clinic.findUnique).mockResolvedValue({
      agentName: 'Test Agent',
      agentFallback: 'Fallback message',
    } as any)

    const { ruleBasedFallback } = await import('../fallback')
    const result = await ruleBasedFallback('cancel karni hai', { clinicId: 'clinic1' })
    expect(result).toContain('cancel')
    expect(result).toContain('reception')
  })

  it('should return fee response for fee keywords', async () => {
    const { db } = await import('../../db')
    vi.mocked(db.clinic.findUnique).mockResolvedValue({
      agentName: 'Test Agent',
      agentFallback: 'Fallback message',
    } as any)

    const { ruleBasedFallback } = await import('../fallback')
    const result = await ruleBasedFallback('fees kitni hai?', { clinicId: 'clinic1' })
    expect(result).toContain('Fees')
  })

  it('should return agentFallback for unrecognized messages', async () => {
    const { db } = await import('../../db')
    vi.mocked(db.clinic.findUnique).mockResolvedValue({
      agentName: 'Test Agent',
      agentFallback: 'Main aap ki madad nahi kar sakta. Clinic se contact karein.',
    } as any)

    const { ruleBasedFallback } = await import('../fallback')
    const result = await ruleBasedFallback('mera dimag kharab hai', { clinicId: 'clinic1' })
    expect(result).toContain('Clinic se contact')
  })
})
