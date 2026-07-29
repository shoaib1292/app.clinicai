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

const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * Create a new Evolution instance for a clinic (returns QR code for scanning).
 * In sandbox, returns a mock QR + session ID.
 */
export async function createEvolutionInstance(clinicId: string, instanceName: string): Promise<{
  instanceId: string
  qrCode: string
  status: string
  error?: string
}> {
  // Sandbox mode: no real Evolution API
  if (!EVOLUTION_BASE_URL) {
    return {
      instanceId: `evo_sandbox_${clinicId.slice(-8)}`,
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      status: 'qr_required',
    }
  }

  try {
    const res = await fetch(`${EVOLUTION_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        instanceName,
        webhook: `${process.env.PUBLIC_BASE_URL}/api/webhooks/evolution`,
        webhookByEvents: true,
        events: ['messages.upsert', 'connection.update', 'qrcode.updated'],
      }),
    })
    const data = await res.json()
    return {
      instanceId: data.instance?.id || instanceName,
      qrCode: data.qrcode || data.base64 || '',
      status: data.status || 'qr_required',
    }
  } catch (err) {
    return { instanceId: '', qrCode: '', status: 'error', error: String(err) }
  }
}

/**
 * Get the QR code for an existing instance (for re-scan if disconnected).
 */
export async function getEvolutionQR(instanceName: string): Promise<{ qrCode: string; status: string }> {
  if (!EVOLUTION_BASE_URL) {
    return { qrCode: '', status: 'sandbox' }
  }
  try {
    const res = await fetch(`${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY },
    })
    const data = await res.json()
    return { qrCode: data.qrcode || data.base64 || '', status: data.status || 'connecting' }
  } catch (err) {
    return { qrCode: '', status: 'error' }
  }
}

/**
 * Send a text message via Evolution API.
 */
export async function sendEvolutionMessage(instanceName: string, to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!EVOLUTION_BASE_URL) {
    // Sandbox: just log
    console.log(`[evo:send] ${instanceName} → ${to}: ${text.slice(0, 80)}...`)
    return { ok: true }
  }
  try {
    const res = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
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
  if (!EVOLUTION_BASE_URL) {
    console.log(`[evo:voice] ${instanceName} → ${to}: [${format} audio, ${audioBase64.length} bytes]`)
    return { ok: true }
  }
  try {
    const res = await fetch(`${EVOLUTION_BASE_URL}/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
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
 * Disconnect an Evolution instance (for clinic offboarding).
 */
export async function disconnectEvolutionInstance(instanceName: string): Promise<{ ok: boolean }> {
  if (!EVOLUTION_BASE_URL) return { ok: true }
  try {
    await fetch(`${EVOLUTION_BASE_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY },
    })
    return { ok: true }
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
