/**
 * Voice processing — STT (Speech-to-Text) + TTS (Text-to-Speech)
 * STT: Uses z-ai-web-dev-sdk / AssemblyAI for transcription.
 * TTS: Uses Callrolin Humnava-v2 API for native Urdu pronunciation.
 * Per founder doc §11: "Voice in → voice out. This is non-negotiable."
 */
import fs from 'fs/promises'
import path from 'path'
import { convertNumbersToUrdu } from './urdu-numbers'

const ASSEMBLYAI_UPLOAD = 'https://api.assemblyai.com/v2/upload'
const ASSEMBLYAI_TRANSCRIPT = 'https://api.assemblyai.com/v2/transcript'
const CALLROLIN_TTS_BASE = 'https://demo.callrolin.com/v1/tts/synthesize'
const DEFAULT_TTS_MODEL = 'humnava-v2'
const LLM_CONFIG_PATH = path.join(process.cwd(), '.llm-config')

async function loadLlmConfig(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(LLM_CONFIG_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

async function getSttApiKey(): Promise<string> {
  const cfg = await loadLlmConfig()
  return cfg.sttApiKey || process.env.ASSEMBLYAI_API_KEY || ''
}

function getTtsApiKey(): string {
  return process.env.CALLROLIN_API_KEY || ''
}

function getTtsModel(): string {
  return process.env.CALLROLIN_TTS_MODEL || DEFAULT_TTS_MODEL
}

// ---------------------------------------------------------------------------
// STT — Transcribe audio to text via AssemblyAI
// ---------------------------------------------------------------------------

export async function transcribeAudio(
  audioBase64: string,
  _mimeType?: string
): Promise<{ text: string; error?: string }> {
  const apiKey = await getSttApiKey()
  if (!apiKey) {
    return { text: '', error: 'ASSEMBLYAI_API_KEY not configured' }
  }

  try {
    // Step 1: Upload audio
    const audioBuffer = Buffer.from(audioBase64, 'base64')
    const uploadRes = await fetch(ASSEMBLYAI_UPLOAD, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/octet-stream',
      },
      body: audioBuffer,
    })
    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => 'Unknown error')
      console.error(`[STT] AssemblyAI upload error ${uploadRes.status}:`, errText)
      return { text: '', error: `STT upload error: ${uploadRes.status}` }
    }
    const { upload_url } = await uploadRes.json() as { upload_url: string }

    // Step 2: Submit transcription with language detection for Urdu
    const transcriptRes = await fetch(ASSEMBLYAI_TRANSCRIPT, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_detection: true,
        language_confidence_threshold: 0.4,
        punctuate: true,
        format_text: true,
      }),
    })
    if (!transcriptRes.ok) {
      const errText = await transcriptRes.text().catch(() => 'Unknown error')
      console.error(`[STT] AssemblyAI transcript error ${transcriptRes.status}:`, errText)
      return { text: '', error: `STT transcript error: ${transcriptRes.status}` }
    }
    const { id } = await transcriptRes.json() as { id: string }

    // Step 3: Poll for result (up to 45s for longer audio)
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 500))
      const pollRes = await fetch(`${ASSEMBLYAI_TRANSCRIPT}/${id}`, {
        headers: { authorization: apiKey },
      })
      if (!pollRes.ok) continue
      const poll = await pollRes.json() as {
        status: string
        text?: string
        error?: string
      }
      if (poll.status === 'completed') {
        const text = poll.text?.trim() || ''
        if (!text) return { text: '', error: 'Empty transcription result' }
        return { text }
      }
      if (poll.status === 'error') {
        return { text: '', error: poll.error || 'AssemblyAI transcription failed' }
      }
    }
    return { text: '', error: 'AssemblyAI transcription timed out' }
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
