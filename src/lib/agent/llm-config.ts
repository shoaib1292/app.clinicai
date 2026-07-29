import fs from 'fs/promises'
import path from 'path'
import { db } from '../db'
import { decrypt } from '../auth'

let _activeProvider = 'openai'
let _activeModel = 'gpt-4o'

export function getActiveProvider(): string { return _activeProvider }
export function getActiveModel(): string { return _activeModel }

const VALID_OPENAI_MODELS = [
  'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o3', 'o3-mini', 'o1', 'o1-mini', 'o4-mini',
]

function validateModel(provider: string, model: string): string {
  if (provider === 'openai') {
    if (VALID_OPENAI_MODELS.includes(model)) return model
    if (model.includes('nano')) {
      console.warn(`[agent] Model "${model}" has limited tool/function calling. Falling back to gpt-4o-mini.`)
      return 'gpt-4o-mini'
    }
    console.warn(`[agent] Unknown model "${model}", falling back to gpt-4o-mini`)
    return 'gpt-4o-mini'
  }
  return model
}

export async function ensureLlmConfig(): Promise<void> {
  const configPath = path.join(process.cwd(), '.llm-config')

  let baseUrl = ''
  let apiKey = ''
  let provider = ''
  let chatModel = 'gpt-4o'
  let ttsModel = 'tongtong'
  let sttModel = 'whisper-1'
  let sttProvider = ''
  let sttApiKey = ''
  let sttBaseUrl = ''

  try {
    // Main key for chat/TTS — exclude assemblyai (STT-only provider)
    const llmKey = await db.lLMKey.findFirst({
      where: { enabled: true, provider: { not: 'assemblyai' } },
      orderBy: { priority: 'asc' },
    })
    if (llmKey) {
      const decrypted = decrypt(llmKey.encryptedKey)
      if (decrypted) apiKey = decrypted
      provider = llmKey.provider
      chatModel = validateModel(provider, llmKey.model || 'gpt-4o')
      ttsModel = llmKey.ttsModel || 'tts-1'
      sttModel = llmKey.sttModel || 'whisper-1'
    }
  } catch (err) {
    console.warn('[agent] Failed to load LLM key from DB:', err)
  }

  // STT-specific key — look for Assembly AI key (separate from chat/TTS key)
  try {
    const sttKey = await db.lLMKey.findFirst({
      where: { enabled: true, provider: 'assemblyai' },
      orderBy: { priority: 'asc' },
    })
    if (sttKey) {
      const decrypted = decrypt(sttKey.encryptedKey)
      if (decrypted) sttApiKey = decrypted
      sttProvider = 'assemblyai'
      sttBaseUrl = 'https://api.assemblyai.com/v2'
      sttModel = sttKey.sttModel || 'assemblyai-best'
    }
  } catch (err) {
    console.warn('[agent] Failed to load STT key from DB:', err)
  }

  if (!apiKey) apiKey = process.env.OPENAI_API_KEY || ''
  if (!provider) provider = 'openai'

  const providerDefaults: Record<string, string> = {
    openai:     'https://api.openai.com/v1',
    anthropic:  'https://api.anthropic.com/v1',
    gemini:     'https://generativelanguage.googleapis.com/v1beta',
    assemblyai: 'https://api.assemblyai.com/v2',
  }
  baseUrl = providerDefaults[provider] || providerDefaults.openai
  _activeModel = chatModel
  _activeProvider = provider

  if (!apiKey) {
    throw new Error(
      'No LLM API key configured. ' +
      'Set OPENAI_API_KEY in .env or add an LLM key in Platform Admin → LLM Keys.'
    )
  }

  await fs.writeFile(configPath, JSON.stringify({
    baseUrl, apiKey, model: chatModel, ttsModel, sttModel,
    provider, sttProvider, sttApiKey, sttBaseUrl,
  }, null, 2), 'utf-8')
  console.log(`[agent] .llm-config written — provider=${provider} model=${chatModel} url=${baseUrl} sttProvider=${sttProvider || 'none'}`)
}

export function isReasoningModel(model: string): boolean {
  if (/nano/i.test(model)) return false
  return /^(o[134]|gpt-5)/.test(model)
}

export function isNanoModel(model: string): boolean {
  return /nano/i.test(model)
}

export function getFallbackModel(model: string): string {
  if (isNanoModel(model)) return 'gpt-4.1-mini'
  if (isReasoningModel(model)) return 'gpt-4o-mini'
  return 'gpt-4o-mini'
}
