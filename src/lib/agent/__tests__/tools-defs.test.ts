import { describe, it, expect } from 'vitest'

describe('Tool Definitions', () => {
  it('should export exactly 13 tools', async () => {
    const { TOOLS } = await import('../tools-defs')
    expect(TOOLS).toHaveLength(13)
  })

  it('should have required tools for booking flow', async () => {
    const { TOOLS } = await import('../tools-defs')
    const names = TOOLS.map((t) => t.function.name)
    expect(names).toContain('list_available_slots')
    expect(names).toContain('book_appointment')
    expect(names).toContain('cancel_appointment')
    expect(names).toContain('reschedule_appointment')
    expect(names).toContain('get_patient_history')
  })

  it('should have tools for patient management', async () => {
    const { TOOLS } = await import('../tools-defs')
    const names = TOOLS.map((t) => t.function.name)
    expect(names).toContain('get_family_member')
    expect(names).toContain('add_family_member')
    expect(names).toContain('get_clinic_info')
  })

  it('should have tools for clinic operations', async () => {
    const { TOOLS } = await import('../tools-defs')
    const names = TOOLS.map((t) => t.function.name)
    expect(names).toContain('get_live_queue_status')
    expect(names).toContain('get_doctor_status')
    expect(names).toContain('transfer_to_human')
    expect(names).toContain('attach_payment_proof')
  })

  it('should have valid function parameters for book_appointment', async () => {
    const { TOOLS } = await import('../tools-defs')
    const bookTool = TOOLS.find((t) => t.function.name === 'book_appointment')
    expect(bookTool).toBeDefined()
    const props = bookTool!.function.parameters.properties
    expect(props).toHaveProperty('doctorId')
    expect(props).toHaveProperty('slotId')
    expect(props).toHaveProperty('patientName')
    expect(props).toHaveProperty('patientPhone')
    expect(bookTool!.function.parameters.required).toContain('doctorId')
    expect(bookTool!.function.parameters.required).toContain('slotId')
    expect(bookTool!.function.parameters.required).toContain('patientName')
    expect(bookTool!.function.parameters.required).toContain('patientPhone')
  })

  it('should all have type "function"', async () => {
    const { TOOLS } = await import('../tools-defs')
    for (const tool of TOOLS) {
      expect(tool.type).toBe('function')
    }
  })

  it('should all have non-empty descriptions', async () => {
    const { TOOLS } = await import('../tools-defs')
    for (const tool of TOOLS) {
      expect(tool.function.description?.length).toBeGreaterThan(10)
    }
  })
})
