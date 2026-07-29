/**
 * Voice processing — STT (Speech-to-Text) + TTS (Text-to-Speech)
 * Uses z-ai-web-dev-sdk for both transcription and synthesis.
 * Per founder doc §11: "Voice in → voice out. This is non-negotiable."
 */
import ZAI from 'z-ai-web-dev-sdk'

/**
 * Transcribe a voice note (audio) to text using ASR.
 * @param audioBase64 - Base64-encoded audio data (WAV, MP3, etc.)
 * @returns Transcribed text
 */
export async function transcribeAudio(audioBase64: string): Promise<{ text: string; error?: string }> {
  try {
    const zai = await ZAI.create()
    const response = await zai.audio.asr.create({
      file_base64: audioBase64,
    })
    if (!response.text || response.text.trim().length === 0) {
      return { text: '', error: 'Empty transcription result' }
    }
    return { text: response.text.trim() }
  } catch (err) {
    console.error('[STT] Transcription error:', err)
    return { text: '', error: String(err) }
  }
}

/**
 * Synthesize text to speech (audio) using TTS.
 * @param text - Text to convert (max 1024 chars; longer text is chunked)
 * @param opts - Voice, speed, format options
 * @returns Base64-encoded audio buffer (WAV format by default)
 */
export async function synthesizeSpeech(
  text: string,
  opts?: { voice?: string; speed?: number; format?: 'wav' | 'mp3' | 'pcm' }
): Promise<{ audioBase64: string; format: string; error?: string }> {
  const voice = opts?.voice || 'tongtong'
  const speed = opts?.speed || 1.0
  const format = opts?.format || 'wav'

  try {
    // Split long text into chunks (max 1024 chars per request)
    const chunks = splitTextIntoChunks(text, 1000)
    const zai = await ZAI.create()

    if (chunks.length === 1) {
      const response = await zai.audio.tts.create({
        input: chunks[0],
        voice,
        speed,
        response_format: format,
        stream: false,
      })
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(new Uint8Array(arrayBuffer))
      return { audioBase64: buffer.toString('base64'), format }
    }

    // For multi-chunk text, synthesize each and concatenate (WAV only supports single stream;
    // for simplicity we return the first chunk for now, or concatenate PCM)
    const audioBuffers: Buffer[] = []
    for (const chunk of chunks) {
      const response = await zai.audio.tts.create({
        input: chunk,
        voice,
        speed,
        response_format: 'pcm', // PCM is easiest to concatenate
        stream: false,
      })
      const arrayBuffer = await response.arrayBuffer()
      audioBuffers.push(Buffer.from(new Uint8Array(arrayBuffer)))
    }
    const combined = Buffer.concat(audioBuffers)
    return { audioBase64: combined.toString('base64'), format: 'pcm' }
  } catch (err) {
    console.error('[TTS] Synthesis error:', err)
    return { audioBase64: '', format: '', error: String(err) }
  }
}

/**
 * Split long text into chunks at sentence boundaries.
 * Each chunk is at most maxLength characters.
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  let currentChunk = ''
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence
    } else {
      if (currentChunk) chunks.push(currentChunk.trim())
      // If a single sentence is longer than maxLength, hard-split it
      if (sentence.length > maxLength) {
        for (let i = 0; i < sentence.length; i += maxLength) {
          chunks.push(sentence.slice(i, i + maxLength).trim())
        }
        currentChunk = ''
      } else {
        currentChunk = sentence
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim())

  return chunks.length > 0 ? chunks : [text]
}

/**
 * Detect if a message is a voice note based on webhook payload.
 * Evolution API and Meta both send audio messages with type 'audio' or 'voice'.
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
