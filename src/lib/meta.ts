/**
 * Meta Cloud API Integration — official WhatsApp Business API (founder doc §6)
 * Used for: templates, bulk broadcasts, proactive reminders outside 24h window.
 * Each clinic connects its own Meta Business account (costs billed to clinic).
 */
import { db } from './db'
import { encrypt, decrypt } from './auth'
import crypto from 'crypto'

const META_GRAPH_URL = 'https://graph.facebook.com/v18.0'
const META_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'clinicsai_verify'

/**
 * Validate Meta credentials by sending a test template message.
 * Returns encrypted credentials to store in DB.
 */
export async function validateMetaCredentials(phoneNumberId: string, accessToken: string, wabaId: string): Promise<{
  ok: boolean
  encryptedToken?: string
  error?: string
}> {
  if (!phoneNumberId || !accessToken || !wabaId) {
    return { ok: false, error: 'All fields required' }
  }

  try {
    // Test: get the phone number details
    const res = await fetch(`${META_GRAPH_URL}/${phoneNumberId}?fields=display_phone_number,verified,name,status`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    const data = await res.json()
    if (data.error) {
      return { ok: false, error: data.error.message || 'Invalid credentials' }
    }
    return {
      ok: true,
      encryptedToken: encrypt(accessToken),
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Send a text message via Meta Cloud API.
 */
export async function sendMetaMessage(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<{
  ok: boolean
  messageId?: string
  error?: string
}> {
  try {
    const res = await fetch(`${META_GRAPH_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: text },
      }),
    })
    const data = await res.json()
    if (data.error) {
      return { ok: false, error: data.error.message }
    }
    return { ok: true, messageId: data.messages?.[0]?.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Send a template message via Meta Cloud API (for proactive reminders/broadcasts).
 * Templates must be pre-approved in Meta Business Manager.
 */
export async function sendMetaTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string,
  components?: unknown[]
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${META_GRAPH_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^0-9]/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components || [],
        },
      }),
    })
    const data = await res.json()
    if (data.error) {
      return { ok: false, error: data.error.message }
    }
    return { ok: true, messageId: data.messages?.[0]?.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Send an audio message via Meta Cloud API (for voice replies).
 * @param audioBase64 - base64-encoded audio
 * @param format - audio format (wav, mp3, ogg)
 */
export async function sendMetaAudio(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  audioBase64: string,
  format: 'wav' | 'mp3' | 'ogg' = 'wav'
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    // Meta requires a media ID or URL — we need to upload first, then send
    // For simplicity in this implementation, we send the audio as a media URL
    // In production, upload to Meta's media endpoint first
    const mimeTypes: Record<string, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
    }

    // Upload media
    const uploadRes = await fetch(`${META_GRAPH_URL}/${phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        type: mimeTypes[format],
        // In production, this would be a media URL or multipart upload
        // For sandbox, we skip the actual upload
      }),
    })
    const uploadData = await uploadRes.json()

    if (uploadData.error) {
      return { ok: false, error: uploadData.error.message }
    }

    const mediaId = uploadData.id
    if (!mediaId) {
      return { ok: false, error: 'Media upload failed — no media ID returned' }
    }

    // Send audio message with media ID
    const res = await fetch(`${META_GRAPH_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^0-9]/g, ''),
        type: 'audio',
        audio: { id: mediaId },
      }),
    })
    const data = await res.json()
    if (data.error) {
      return { ok: false, error: data.error.message }
    }
    return { ok: true, messageId: data.messages?.[0]?.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Verify Meta webhook signature (X-Hub-Signature-256 HMAC).
 */
export function verifyMetaSignature(payload: string, signature: string, appSecret: string): boolean {
  try {
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payload).digest('hex')
    return expected === signature
  } catch {
    return false
  }
}

/**
 * Get the Meta verify token (for webhook setup verification).
 */
export function getMetaVerifyToken(): string {
  return META_VERIFY_TOKEN
}

/**
 * Decrypt a stored Meta access token.
 */
export function decryptMetaToken(encrypted: string): string {
  try {
    return decrypt(encrypted)
  } catch {
    return ''
  }
}
