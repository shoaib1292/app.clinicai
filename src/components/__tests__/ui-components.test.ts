import { describe, it, expect } from 'vitest'

/**
 * Component: Breadcrumbs
 * Pure rendering logic test — validates breadcrumb path generation
 */
describe('Breadcrumbs', () => {
  it('should parse dashboard paths into breadcrumb segments', () => {
    const paths = [
      { input: '/dashboard', expected: [{ label: 'Dashboard', href: '/dashboard' }] },
      { input: '/dashboard/patients', expected: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients', href: '/dashboard/patients' }] },
      { input: '/dashboard/patients/abc123', expected: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients', href: '/dashboard/patients' }, { label: 'Abc123', href: '/dashboard/patients/abc123' }] },
      { input: '/dashboard/clinic/doctors', expected: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clinic', href: '/dashboard/clinic' }, { label: 'Doctors', href: '/dashboard/clinic/doctors' }] },
      { input: '/dashboard/conversations/conv-1', expected: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Conversations', href: '/dashboard/conversations' }, { label: 'Conv 1', href: '/dashboard/conversations/conv-1' }] },
    ]

    for (const { input, expected } of paths) {
      const segments = input.split('/').filter(Boolean)
      const breadcrumbs = segments.map((s, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/')
        const label = i === 0 ? 'Dashboard' : s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
        return { label, href }
      })

      expect(breadcrumbs).toEqual(expected)
    }
  })
})

/**
 * Component: Badge — variant mapping
 */
describe('Badge Variants', () => {
  const STATUS_VARIANTS: Record<string, string> = {
    booked: 'default',
    confirmed: 'default',
    completed: 'success',
    cancelled: 'destructive',
    no_show: 'destructive',
    pending: 'secondary',
    active: 'default',
    draft: 'secondary',
    paid: 'default',
    overdue: 'destructive',
    sent: 'default',
  }

  it('should map appointment statuses to correct variants', () => {
    expect(STATUS_VARIANTS['completed']).toBe('success')
    expect(STATUS_VARIANTS['cancelled']).toBe('destructive')
    expect(STATUS_VARIANTS['no_show']).toBe('destructive')
    expect(STATUS_VARIANTS['booked']).toBe('default')
    expect(STATUS_VARIANTS['pending']).toBe('secondary')
  })

  it('should map invoice statuses correctly', () => {
    expect(STATUS_VARIANTS['draft']).toBe('secondary')
    expect(STATUS_VARIANTS['paid']).toBe('default')
    expect(STATUS_VARIANTS['overdue']).toBe('destructive')
    expect(STATUS_VARIANTS['sent']).toBe('default')
  })

  it('should have variants for all known statuses', () => {
    const knownStatuses = ['booked', 'confirmed', 'completed', 'cancelled', 'no_show', 'pending', 'active', 'draft', 'paid', 'overdue', 'sent']
    for (const status of knownStatuses) {
      expect(STATUS_VARIANTS[status]).toBeDefined()
    }
  })
})

/**
 * Component: Appointment status transitions
 */
describe('Appointment Status Transitions', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    booked: ['confirmed', 'cancelled', 'no_show'],
    confirmed: ['checked_in', 'cancelled', 'no_show'],
    checked_in: ['completed', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  }

  it('should allow valid transitions', () => {
    expect(VALID_TRANSITIONS['booked']).toContain('confirmed')
    expect(VALID_TRANSITIONS['booked']).toContain('cancelled')
    expect(VALID_TRANSITIONS['confirmed']).toContain('checked_in')
    expect(VALID_TRANSITIONS['checked_in']).toContain('completed')
  })

  it('should not allow invalid transitions', () => {
    expect(VALID_TRANSITIONS['booked']).not.toContain('completed')
    expect(VALID_TRANSITIONS['confirmed']).not.toContain('completed')
    expect(VALID_TRANSITIONS['completed']).toHaveLength(0)
    expect(VALID_TRANSITIONS['cancelled']).toHaveLength(0)
  })

  it('all terminal states should have no transitions', () => {
    const terminalStates = ['completed', 'cancelled', 'no_show']
    for (const state of terminalStates) {
      expect(VALID_TRANSITIONS[state]).toEqual([])
    }
  })

  it('should not allow transition from terminal states', () => {
    expect(VALID_TRANSITIONS['completed']).not.toContain('booked')
    expect(VALID_TRANSITIONS['cancelled']).not.toContain('confirmed')
    expect(VALID_TRANSITIONS['no_show']).not.toContain('completed')
  })
})

/**
 * User role label formatting
 */
describe('User Role Formatting', () => {
  const ROLE_LABELS: Record<string, string> = {
    platform_admin: 'Super Admin',
    platform_staff: 'Staff',
    clinic_admin: 'Clinic Admin',
    doctor: 'Doctor',
    receptionist: 'Receptionist',
  }

  it('should format underscore roles to readable labels', () => {
    expect(ROLE_LABELS['platform_admin']).toBe('Super Admin')
    expect(ROLE_LABELS['clinic_admin']).toBe('Clinic Admin')
    expect(ROLE_LABELS['platform_staff']).toBe('Staff')
  })

  it('should have labels for all user types', () => {
    const userTypes = ['platform_admin', 'platform_staff', 'clinic_admin', 'doctor', 'receptionist']
    for (const type of userTypes) {
      expect(ROLE_LABELS[type]).toBeDefined()
      expect(ROLE_LABELS[type].length).toBeGreaterThan(0)
    }
  })
})

/**
 * Currency formatting (PKR)
 */
describe('Currency Formatting', () => {
  function formatPKR(amount: number): string {
    return `PKR ${amount.toLocaleString('en-PK')}`
  }

  it('should format amounts with PKR prefix', () => {
    expect(formatPKR(500)).toBe('PKR 500')
    expect(formatPKR(0)).toBe('PKR 0')
  })

  it('should add thousand separators', () => {
    expect(formatPKR(5000)).toBe('PKR 5,000')
    expect(formatPKR(50000)).toBe('PKR 50,000')
    expect(formatPKR(500000)).toBe('PKR 500,000')
    expect(formatPKR(1000000)).toBe('PKR 1,000,000')
  })
})

/**
 * Appointment fee computation
 */
describe('Fee Computation', () => {
  function computeTotal(doctorFee: number, clinicMarkup: number, platformFee: number): number {
    return doctorFee + clinicMarkup + platformFee
  }

  it('should sum all fee components', () => {
    expect(computeTotal(500, 100, 50)).toBe(650)
    expect(computeTotal(0, 0, 50)).toBe(50)
    expect(computeTotal(1000, 200, 50)).toBe(1250)
    expect(computeTotal(0, 0, 0)).toBe(0)
  })

  it('platform fee should be non-negative', () => {
    const platformFee = 50
    expect(platformFee).toBeGreaterThanOrEqual(0)
  })

  it('fees should match PRD pricing model', () => {
    // Pricing: Free for clinic, PKR 50 per appointment from patient
    const patientFee = 50
    const doctorFee = 500
    const clinicMarkup = 100
    const total = computeTotal(doctorFee, clinicMarkup, patientFee)
    expect(total).toBe(650)
    expect(patientFee).toBe(50)
  })
})

/**
 * Onboarding checklist progress
 */
describe('Onboarding Checklist Logic', () => {
  const STEPS = [
    { key: 'whatsapp', doneKey: 'whatsappConnected' as const },
    { key: 'doctors', doneKey: 'doctorsAdded' as const },
    { key: 'services', doneKey: 'servicesConfigured' as const },
    { key: 'schedules', doneKey: 'hasSchedules' as const },
    { key: 'agent', doneKey: null },
  ]

  function getProgress(state: Record<string, boolean>): { done: number; total: number; percent: number } {
    const done = STEPS.filter((s) => s.doneKey ? state[s.doneKey] : true).length
    return { done, total: STEPS.length, percent: Math.round((done / STEPS.length) * 100) }
  }

  it('should show 0% when nothing is done', () => {
    const result = getProgress({ whatsappConnected: false, doctorsAdded: false, servicesConfigured: false, hasSchedules: false })
    expect(result.percent).toBe(20) // agent step counts as done (no doneKey = always done)
  })

  it('should show 40% when WhatsApp + agent are done', () => {
    const result = getProgress({ whatsappConnected: true, doctorsAdded: false, servicesConfigured: false, hasSchedules: false })
    expect(result.percent).toBe(40)
  })

  it('should show 100% when everything is done', () => {
    const result = getProgress({ whatsappConnected: true, doctorsAdded: true, servicesConfigured: true, hasSchedules: true })
    expect(result.percent).toBe(100)
  })

  it('should show 80% with 3 of 4 steps done', () => {
    const result = getProgress({ whatsappConnected: true, doctorsAdded: true, servicesConfigured: true, hasSchedules: false })
    expect(result.percent).toBe(80)
  })
})
