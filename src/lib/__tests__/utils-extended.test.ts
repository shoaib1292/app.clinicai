import { describe, it, expect } from 'vitest'

/**
 * Unit tests for utility functions used across the app
 */

describe('Phone Utilities', () => {
  function extractLast4(phone: string): string {
    return phone.replace(/\D/g, '').slice(-4)
  }

  function isValidPakistanPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '')
    return /^0?3\d{9}$/.test(digits) || /^92?3\d{9}$/.test(digits)
  }

  it('should extract last 4 digits', () => {
    expect(extractLast4('0300-1234567')).toBe('4567')
    expect(extractLast4('+923001234567')).toBe('4567')
    expect(extractLast4('03001234567')).toBe('4567')
    expect(extractLast4('1234')).toBe('1234')
  })

  it('should validate Pakistan phone formats', () => {
    expect(isValidPakistanPhone('03001234567')).toBe(true)
    expect(isValidPakistanPhone('+923001234567')).toBe(true)
    expect(isValidPakistanPhone('923001234567')).toBe(true)
    expect(isValidPakistanPhone('12345')).toBe(false)
    expect(isValidPakistanPhone('abc')).toBe(false)
    expect(isValidPakistanPhone('0300-1234567')).toBe(true)
  })

  it('should handle empty strings', () => {
    expect(extractLast4('')).toBe('')
    expect(isValidPakistanPhone('')).toBe(false)
  })
})

describe('Date Utilities', () => {
  function toPakistanISO(date: Date): string {
    return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function formatTime24(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0')
    const m = date.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  it('should format date in Pakistan locale', () => {
    const d = new Date('2026-01-15T00:00:00+05:00')
    expect(toPakistanISO(d)).toMatch(/\d{2}-[A-Za-z]{3}-\d{4}/)
  })

  it('should format time in 24h format', () => {
    const d = new Date('2026-01-15T09:30:00')
    expect(formatTime24(d)).toBe('09:30')
  })

  it('should handle midnight', () => {
    const d = new Date('2026-01-15T00:00:00')
    expect(formatTime24(d)).toBe('00:00')
  })

  it('should handle 23:59', () => {
    const d = new Date('2026-01-15T23:59:00')
    expect(formatTime24(d)).toBe('23:59')
  })
})

describe('URL Slug Generator', () => {
  function toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  it('should convert clinic names to URL slugs', () => {
    expect(toSlug('Dr. Ali Clinic')).toBe('dr-ali-clinic')
    expect(toSlug('Fatima  Medical  Center')).toBe('fatima-medical-center')
    expect(toSlug('ABC Clinic 123')).toBe('abc-clinic-123')
  })

  it('should handle special characters', () => {
    expect(toSlug("Khan's Clinic!")).toBe('khans-clinic')
    expect(toSlug('  White Space  ')).toBe('white-space')
  })

  it('should handle empty strings', () => {
    expect(toSlug('')).toBe('')
  })

  it('should handle Urdu transliterations', () => {
    expect(toSlug('Sehat Clinic لاہور')).toBe('sehat-clinic-')
  })
})

describe('Pagination Utilities', () => {
  function getPaginationRange(current: number, total: number, maxVisible = 5): (number | 'ellipsis')[] {
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    const pages: (number | 'ellipsis')[] = []
    pages.push(1)

    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)

    if (start > 2) pages.push('ellipsis')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < total - 1) pages.push('ellipsis')

    pages.push(total)
    return pages
  }

  it('should show all pages for small total', () => {
    expect(getPaginationRange(1, 3)).toEqual([1, 2, 3])
    expect(getPaginationRange(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('should show ellipsis for large totals', () => {
    const result = getPaginationRange(1, 20)
    expect(result[0]).toBe(1)
    expect(result).toContain('ellipsis')
    expect(result[result.length - 1]).toBe(20)
  })

  it('should keep current page visible', () => {
    const result = getPaginationRange(5, 20)
    expect(result).toContain(5)
    expect(result).toContain('ellipsis')
  })

  it('should handle first and last page edge cases', () => {
    const first = getPaginationRange(1, 20)
    expect(first).toContain(1)
    expect(first).toContain(2)
    expect(first).not.toContain(0)

    const last = getPaginationRange(20, 20)
    expect(last).toContain(20)
    expect(last).toContain(19)
    expect(last).not.toContain(21)
  })
})

describe('Queue Token Utilities', () => {
  function generateTokenNumber(lastToken: number): number {
    return lastToken + 1
  }

  function formatTokenDisplay(tokenNo: number): string {
    return String(tokenNo).padStart(3, '0')
  }

  it('should increment token numbers', () => {
    expect(generateTokenNumber(0)).toBe(1)
    expect(generateTokenNumber(5)).toBe(6)
    expect(generateTokenNumber(99)).toBe(100)
  })

  it('should format token with leading zeros', () => {
    expect(formatTokenDisplay(1)).toBe('001')
    expect(formatTokenDisplay(15)).toBe('015')
    expect(formatTokenDisplay(999)).toBe('999')
  })
})
