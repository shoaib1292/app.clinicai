import { describe, it, expect } from 'vitest'

describe('parseTextToolCalls()', () => {
  it('should parse <tool_call> blocks with key-value args', async () => {
    const { parseTextToolCalls } = await import('../parse-text-calls')
    const input = `
<tool_call>list_available_slots</tool_call>
<arg_key>doctorId</arg_key><arg_value>doc123</arg_value>
<arg_key>date</arg_key><arg_value>2026-07-02</arg_value>
    `.trim()
    const result = parseTextToolCalls(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('list_available_slots')
    expect(result[0].args).toEqual({ doctorId: 'doc123', date: '2026-07-02' })
  })

  it('should parse multiple <tool_call> blocks', async () => {
    const { parseTextToolCalls } = await import('../parse-text-calls')
    const input = `
<tool_call>get_family_member</tool_call>
<tool_call>list_available_slots</tool_call>
<arg_key>doctorId</arg_key><arg_value>doc456</arg_value>
    `.trim()
    const result = parseTextToolCalls(input)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('get_family_member')
    expect(result[1].name).toBe('list_available_slots')
  })

  it('should parse fenced JSON block (single object)', async () => {
    const { parseTextToolCalls } = await import('../parse-text-calls')
    const input = 'Some text\n```json\n{"name":"get_doctor_status","arguments":{"doctorId":"doc123"}}\n```'
    const result = parseTextToolCalls(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('get_doctor_status')
    expect(result[0].args).toEqual({ doctorId: 'doc123' })
  })

  it('should parse fenced JSON block (array)', async () => {
    const { parseTextToolCalls } = await import('../parse-text-calls')
    const input = '```json\n[{"name":"tool1","arguments":{"a":1}},{"name":"tool2","arguments":{"b":2}}]\n```'
    const result = parseTextToolCalls(input)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('tool1')
    expect(result[1].name).toBe('tool2')
  })

  it('should parse OpenAI-style function format', async () => {
    const { parseTextToolCalls } = await import('../parse-text-calls')
    const input = '```json\n{"function":{"name":"book_appointment","arguments":{"slotId":"cm123"}}}\n```'
    const result = parseTextToolCalls(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('book_appointment')
    expect(result[0].args).toEqual({ slotId: 'cm123' })
  })

  it('should return empty array for text with no tool calls', async () => {
    const { parseTextToolCalls } = await import('../parse-text-calls')
    const result = parseTextToolCalls('Just a normal reply with no tool calls')
    expect(result).toHaveLength(0)
  })

  it('should prefer <tool_call> format over JSON when both present', async () => {
    const { parseTextToolCalls } = await import('../parse-text-calls')
    const input = '<tool_call>list_available_slots</tool_call>\n```json\n{"name":"other_tool","arguments":{}}\n```'
    const result = parseTextToolCalls(input)
    // Should return only the <tool_call> result since it's checked first
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('list_available_slots')
  })

  it('should parse numbers in arg_value as numbers', async () => {
    const { parseTextToolCalls } = await import('../parse-text-calls')
    const input = '<tool_call>book_appointment</tool_call><arg_key>amount</arg_key><arg_value>500</arg_value>'
    const result = parseTextToolCalls(input)
    expect(result[0].args.amount).toBe(500)
  })
})
