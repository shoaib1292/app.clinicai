import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs — make the first config read succeed so ensureLlmConfig is never called
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
vi.mock('fs/promises', () => ({
  default: { readFile: mockReadFile, writeFile: mockWriteFile },
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}))

// Mock ensureLlmConfig in llm-config so it never actually runs
vi.mock('../llm-config', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    ensureLlmConfig: vi.fn(),
    getFallbackModel: actual.getFallbackModel,
    isReasoningModel: actual.isReasoningModel,
    isNanoModel: actual.isNanoModel,
  }
})

const VALID_CONFIG = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'test-key-123',
  model: 'gpt-4o',
}

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('createChatCompletion()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadFile.mockReset()
    mockWriteFile.mockReset()
    mockFetch.mockReset()
  })

  it('should read config and make API call', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(VALID_CONFIG))
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Hello!' } }],
      }),
    })

    const { createChatCompletion } = await import('../chat')
    const result = await createChatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
    })

    expect(result.choices[0].message.content).toBe('Hello!')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key-123',
        }),
      })
    )
  })

  it('should strip temperature for reasoning models', async () => {
    const config = { ...VALID_CONFIG, model: 'o1' }
    mockReadFile.mockResolvedValue(JSON.stringify(config))
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    })

    const { createChatCompletion } = await import('../chat')
    await createChatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.7,
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.temperature).toBeUndefined()
    expect(callBody.model).toBe('o1')
    expect(callBody.reasoning_effort).toBe('medium')
  })

  it('should NOT strip temperature for nano models', async () => {
    const config = { ...VALID_CONFIG, model: 'gpt-5-nano' }
    mockReadFile.mockResolvedValue(JSON.stringify(config))
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    })

    const { createChatCompletion } = await import('../chat')
    await createChatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.7,
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.temperature).toBe(0.7)
    expect(callBody.model).toBe('gpt-5-nano')
  })

  it('should fall back on API error', async () => {
    const config = { ...VALID_CONFIG, model: 'gpt-5' }
    mockReadFile.mockResolvedValue(JSON.stringify(config))

    // First call fails with 500, second succeeds with fallback model
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal error'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'Fallback reply' } }] }),
      })

    const { createChatCompletion } = await import('../chat')
    const result = await createChatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
    })

    expect(result.choices[0].message.content).toBe('Fallback reply')
    // Should have tried fallback model
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(secondCallBody.model).toBe('gpt-4o-mini')
  })

  it('should convert max_tokens to max_completion_tokens for reasoning models', async () => {
    const config = { ...VALID_CONFIG, model: 'o3' }
    mockReadFile.mockResolvedValue(JSON.stringify(config))
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    })

    const { createChatCompletion } = await import('../chat')
    await createChatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 1000,
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.max_tokens).toBeUndefined()
    expect(callBody.max_completion_tokens).toBe(1000)
  })
})
