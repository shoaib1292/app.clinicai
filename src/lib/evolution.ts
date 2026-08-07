/**
 * Evolution API Integration — QR-based WhatsApp connection (founder doc §6-7)
 * In sandbox, we cannot connect real Evolution API, but the code path is written
 * for production wiring. The flow:
 * 1. Clinic admin chooses "QR mode" → platform creates Evolution instance
 * 2. Returns QR code → admin scans once → status flips to "connected"
 * 3. Inbound messages arrive at /api/webhooks/evolution
 * 4. Agent on/off toggle works without rescanning QR
 */
import { db } from './db'
import { decrypt } from './auth'

const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * Resolve Evolution API credentials — DB (platform admin managed) with .env fallback.
 * This is called on every request to pick up live key changes without restart.
 */
export async function resolveEvoCredentials(): Promise<{ baseUrl: string; apiKey: string }> {
  try {
    const dbKey = await db.evolutionApiKey.findFirst({
      where: { enabled: true },
      orderBy: { createdAt: 'desc' },
    })
    if (dbKey) {
      const decrypted = decrypt(dbKey.encryptedKey)
      if (decrypted) {
        return { baseUrl: dbKey.baseUrl, apiKey: decrypted }
      }
    }
  } catch {
    // DB not available or model not migrated yet — fall through to env
  }
  return { baseUrl: EVOLUTION_BASE_URL, apiKey: EVOLUTION_API_KEY }
}

/**
 * Safely parse a fetch Response to JSON, returning an error object on failure.
 */
export async function safeJson(res: Response): Promise<Record<string, unknown> & { error?: string }> {
  try {
    const text = await res.text()
    if (!text) return {}
    return JSON.parse(text)
  } catch {
    return { error: 'Invalid JSON response from Evolution API' }
  }
}

/**
 * Translate raw Evolution API errors into user-friendly messages.
 */
export function friendlyEvoError(err: unknown): string {
  const msg = String(err)
  if (msg.includes('timeout') || msg.includes('abort') || msg.includes('ECONNREFUSED'))
    return 'Evolution API connection failed. Please check if the server is running and try again.'
  if (msg.includes('401') || msg.includes('Unauthorized'))
    return 'Evolution API key is invalid. Please check your API key in settings.'
  if (msg.includes('404') || msg.includes('not found'))
    return 'WhatsApp instance not found. Please recreate the connection.'
  if (msg.includes('already')) return msg
  return msg
}

/**
 * Create a new Evolution instance for a clinic (returns QR code for scanning).
 * In sandbox, returns a mock QR + session ID.
 */
export async function createEvolutionInstance(
  clinicId: string,
  instanceName: string,
  opts?: { mode?: 'qr' | 'code'; phoneNumber?: string }
): Promise<{
  instanceId: string
  qrCode: string
  status: string
  error?: string
}> {
  const { baseUrl, apiKey } = await resolveEvoCredentials()

  // Sandbox mode: no real Evolution API
  if (!baseUrl) {
    return {
      instanceId: `evo_sandbox_${clinicId.slice(-8)}`,
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      status: 'qr_required',
    }
  }

  try {
    const webhookDomain = process.env.WHATSAPP_WEBHOOK_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://app.clinicai.pk'
    const createRes = await fetch(`${baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhookByEvents: true,
        webhook: {
          enabled: true,
          url: `${webhookDomain}/api/webhooks/evolution`,
          events: ['messages.upsert', 'connection.update', 'qrcode.updated'],
        },
      }),
    })
    const createData = await createRes.json()
    if (!createRes.ok) {
      return { instanceId: '', qrCode: '', status: 'error', error: createData.error || createData.message || `Create failed (${createRes.status})` }
    }

    const instanceId = createData.instance?.instanceId || createData.instanceId || instanceName

    // QR code comes as nested object { base64, code, pairingCode, count }
    const qrData = createData.qrcode
    const qrCode = (qrData && typeof qrData === 'object' ? (qrData as { base64?: string; code?: string }).base64 : null)
      || (typeof qrData === 'string' ? qrData : null)
      || createData.base64
      || ''

    return { instanceId, qrCode, status: 'qr_required' }
  } catch (err) {
    return { instanceId: '', qrCode: '', status: 'error', error: String(err) }
  }
}

/**
 * Connect Evolution instance via phone number pairing code.
 * Used when clinic admin selects "code" mode instead of QR scanning.
 */
export async function connectEvolutionWithCode(
  instanceName: string,
  phone: string
): Promise<{ pairingCode?: string; error?: string }> {
  const { baseUrl, apiKey } = await resolveEvoCredentials()
  if (!baseUrl) {
    return { pairingCode: 'SANDBOX-CODE', error: undefined }
  }
  try {
    const res = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { error: data.message || data.error || `Evolution API error: ${res.status}` }
    }
    return { pairingCode: data.code || data.pairingCode || data.pairing_code }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Get the QR code for an existing instance (for re-scan if disconnected).
 */
export async function getEvolutionQR(instanceName: string): Promise<{ qrCode: string; status: string }> {
  const { baseUrl, apiKey } = await resolveEvoCredentials()
  if (!baseUrl) {
    return { qrCode: '', status: 'sandbox' }
  }
  try {
    const res = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: { 'apikey': apiKey },
    })
    const data = await res.json()
    return { qrCode: data.base64 || data.qrcode || '', status: data.state || data.status || 'connecting' }
  } catch (err) {
    return { qrCode: '', status: 'error' }
  }
}

/**
 * Send a text message via Evolution API.
 */
export async function sendEvolutionMessage(instanceName: string, to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const { baseUrl, apiKey } = await resolveEvoCredentials()
  if (!baseUrl) {
    console.log(`[evo:send] ${instanceName} → ${to}: ${text.slice(0, 80)}...`)
    return { ok: true }
  }
  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ number: to, text }),
    })
    return { ok: res.ok }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Send a voice/audio message via Evolution API.
 * @param audioBase64 - base64-encoded audio (WAV/MP3)
 * @param format - audio format (wav, mp3, ogg)
 */
export async function sendEvolutionVoice(
  instanceName: string,
  to: string,
  audioBase64: string,
  format: 'wav' | 'mp3' | 'ogg' = 'wav'
): Promise<{ ok: boolean; error?: string }> {
  const { baseUrl, apiKey } = await resolveEvoCredentials()
  if (!baseUrl) {
    console.log(`[evo:voice] ${instanceName} → ${to}: [${format} audio, ${audioBase64.length} bytes]`)
    return { ok: true }
  }
  try {
    const res = await fetch(`${baseUrl}/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: to,
        audio: audioBase64,
        mimetype: `audio/${format}`,
      }),
    })
    return { ok: res.ok }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Update the webhook URL for an Evolution instance.
 */
export async function updateEvolutionWebhook(
  instanceName: string,
  webhookUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const { baseUrl, apiKey } = await resolveEvoCredentials()
  if (!baseUrl) return { ok: true }
  try {
    const res = await fetch(`${baseUrl}/webhook/${instanceName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ enabled: true, url: webhookUrl }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: (data as { message?: string }).message || `Failed (${res.status})` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Disconnect an Evolution instance (for clinic offboarding).
 */
export async function disconnectEvolutionInstance(instanceName: string): Promise<{ ok: boolean }> {
  const { baseUrl, apiKey } = await resolveEvoCredentials()
  if (!baseUrl) return { ok: true }
  try {
    const res = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey },
    })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

/**
 * Store WhatsApp connection details in the database.
 */
export async function saveWhatsAppConnection(clinicId: string, data: {
  phoneNumber: string
  instanceName: string
  mode: string // 'evo' | 'meta' | 'both'
  status: string
  qrCode?: string
}): Promise<void> {
  // Check if a connection exists for this clinic + phone
  const existing = await db.whatsAppConnection.findFirst({
    where: { clinicId, phone: data.phoneNumber },
  })
  if (existing) {
    await db.whatsAppConnection.update({
      where: { id: existing.id },
      data: {
        evoInstanceName: data.instanceName,
        mode: data.mode,
        status: data.status,
      },
    })
  } else {
    await db.whatsAppConnection.create({
      data: {
        clinicId,
        phone: data.phoneNumber,
        evoInstanceName: data.instanceName,
        mode: data.mode,
        status: data.status,
        filterGroups: true,
        filterStatus: true,
      },
    })
  }
}
