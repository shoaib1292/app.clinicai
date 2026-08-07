/**
 * Voice processing — STT (Speech-to-Text) + TTS (Text-to-Speech)
 * STT: Uses z-ai-web-dev-sdk / AssemblyAI for transcription.
 * TTS: Uses Callrolin Humnava-v2 API for native Urdu pronunciation.
 * Per founder doc §11: "Voice in → voice out. This is non-negotiable."
 */
import { convertNumbersToUrdu } from './urdu-numbers'

const CALLROLIN_STT_BASE = 'https://stt.callrolin.com/api/transcribe'
const CALLROLIN_TTS_BASE = 'https://demo.callrolin.com/v1/tts/synthesize'
const DEFAULT_STT_MODEL = 'callrolin-stt-v1'
const DEFAULT_TTS_MODEL = 'humnava-v2'

function getSttApiKey(): string {
  return process.env.CALLROLIN_STT_API_KEY || ''
}

function getSttModel(): string {
  return process.env.CALLROLIN_STT_MODEL || DEFAULT_STT_MODEL
}

function getTtsApiKey(): string {
  return process.env.CALLROLIN_API_KEY || ''
}

function getTtsModel(): string {
  return process.env.CALLROLIN_TTS_MODEL || DEFAULT_TTS_MODEL
}

// ---------------------------------------------------------------------------
// STT — Transcribe audio to text via Callrolin STT API
// ---------------------------------------------------------------------------

export async function transcribeAudio(
  audioBase64: string,
  mimeType?: string
): Promise<{ text: string; error?: string }> {
  const apiKey = getSttApiKey()
  if (!apiKey) {
    return { text: '', error: 'CALLROLIN_STT_API_KEY not configured' }
  }

  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64')
    const ext = mimeType?.includes('ogg') || mimeType?.includes('opus') ? 'ogg'
      : mimeType?.includes('mp3') || mimeType?.includes('mpeg') ? 'mp3'
      : 'wav'

    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer]), `audio.${ext}`)
    formData.append('language', 'ur')
    formData.append('model', getSttModel())

    const response = await fetch(CALLROLIN_STT_BASE, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: formData,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error')
      console.error(`[STT] Callrolin STT error ${response.status}:`, errText)
      return { text: '', error: `STT API error: ${response.status}` }
    }

    const result = await response.json() as { text?: string; error?: string }
    if (!result.text || result.text.trim().length === 0) {
      return { text: '', error: result.error || 'Empty transcription result' }
    }
    return { text: result.text.trim() }
  } catch (err) {
    console.error('[STT] Transcription error:', err)
    return { text: '', error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// TTS — Synthesize text to speech using Callrolin Humnava-v2
// ---------------------------------------------------------------------------

export async function synthesizeSpeech(
  text: string,
  opts?: { voice?: string; speed?: number; format?: 'wav' | 'mp3' | 'pcm' }
): Promise<{ audioBase64: string; format: string; error?: string }> {
  const apiKey = getTtsApiKey()
  if (!apiKey) {
    return { audioBase64: '', format: '', error: 'CALLROLIN_API_KEY not configured' }
  }

  // Convert numbers to Urdu script for native pronunciation
  // e.g. "PKR 350" → "PKR تین سو پچاس"
  const processedText = convertNumbersToUrdu(text)

  const format = opts?.format || 'wav'

  try {
    const response = await fetch(CALLROLIN_TTS_BASE, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTtsModel(),
        text: processedText,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error')
      console.error(`[TTS] Callrolin API error ${response.status}:`, errText)
      return { audioBase64: '', format: '', error: `TTS API error: ${response.status}` }
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    const latency = response.headers.get('X-Latency-Ms')

    if (latency) {
      console.log(`[TTS] Synthesized in ${latency}ms — ${text.length} chars → ${audioBuffer.length} bytes`)
    }

    return { audioBase64: audioBuffer.toString('base64'), format }
  } catch (err) {
    console.error('[TTS] Synthesis error:', err)
    return { audioBase64: '', format: '', error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map clinic agent gender to a TTS voice identifier.
 * Callrolin Humnava-v2 uses gender-based voice selection internally;
 * we pass the gender so the agent can pick the right voice profile.
 */
export function getVoiceForGender(gender: string | null): string {
  if (!gender) return 'female'
  if (gender === 'male') return 'male'
  return 'female'
}

/**
 * Detect if a message is written in Urdu (Nastaliq script), Roman Urdu,
 * or English, and return a language code the agent can use to decide
 * reply language.
 */
export function detectLanguage(text: string): string {
  if (!text) return 'roman-urdu'

  const urduRange = /[\u0600-\u06FF]/
  const urduChars = text.match(urduRange)
  if (urduChars && urduChars.length >= text.replace(/\s/g, '').length * 0.25) {
    return 'urdu'
  }

  // Common Roman Urdu words that signal Hindi/Urdu
  const romanUrduMarkers = /\b(kya|hai|hain|ho|mein|aap|tum|mera|meri|ka|ki|se|ne|ko|par|bhi|nahi|han|ji|theek|shukriya|acha|abhi|kal|parsoun|karein|karo|dijiye|len|dein|lagen|bolo|suno|jao|aao|kar|hoon|hun)\b/i
  const englishCommonWords = /\b(the|is|are|was|were|be|been|have|has|had|do|does|did|will|would|can|could|should|may|might|i|you|he|she|it|we|they|my|your|his|her|our|their|a|an|and|or|but|not|this|that|these|those)\b/i

  const romanMatches = text.match(romanUrduMarkers)
  const englishMatches = text.match(englishCommonWords)

  if (romanMatches && (!englishMatches || romanMatches.length > englishMatches.length)) {
    return 'roman-urdu'
  }

  return 'english'
}

/**
 * Map detected language to the language the agent should reply in.
 */
export function replyLanguage(detectedLang: string): string {
  if (detectedLang === 'urdu' || detectedLang === 'roman-urdu') return 'urdu'
  return 'english'
}

/**
 * Detect if a message is a voice note based on webhook payload.
 */
export function isVoiceMessage(payload: {
  type?: string
  message?: { type?: string; audio?: unknown; voice?: unknown }
}): boolean {
  if (!payload) return false
  if (payload.type === 'audio' || payload.type === 'voice') return true
  if (payload.message?.type === 'audio' || payload.message?.type === 'voice') return true
  return false
}
