import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { hashPhone } from '@/lib/auth'
import { encryptPhone } from '@/lib/phone-encryption'
import { runAgent } from '@/lib/agent'
import { filterInboundMessage, logFilteredMessage, isDuplicateMessage } from '@/lib/filter'
import { sendEvolutionMessage, sendEvolutionVoice, resolveEvoCredentials } from '@/lib/evolution'
import { isVoiceMessage } from '@/lib/voice'

const REALTIME_PORT = process.env.REALTIME_PORT || '3003'

/** Broadcast event to the realtime Socket.io mini-service (separate process on port 3003). */
async function broadcastToRealtime(channel: string, message: unknown): Promise<void> {
  try {
    await fetch(`http://localhost:${REALTIME_PORT}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, message }),
    })
  } catch {
    // Realtime service may be down — fail silently
  }
}

/**
 * Evolution API Webhook — receives inbound WhatsApp messages.
 * Per founder doc §8:
 * 1. Authenticate (Evolution token)
 * 2. Filter step (group/status broadcasts)
 * 3. Resolve clinic_id from receiving number
 * 4. Dedup via provider_msg_id (24h TTL)
 * 5. Persist Message(in)
 * 6. Enqueue to conversation worker → run agent
 * 7. Send outbound reply via Evolution API
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate the inbound webhook. Evolution delivers webhooks with an
    // `apikey` header (or a query token on some deployments). Accept the DB
    // (platform admin managed) key, falling back to the .env key.
    const { apiKey } = await resolveEvoCredentials()
    if (apiKey) {
      const headerKey = req.headers.get('apikey') || req.headers.get('x-api-key')
      const queryToken = new URL(req.url).searchParams.get('token')
      if (headerKey !== apiKey && queryToken !== apiKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const rawBody = await req.text()
    const payload = JSON.parse(rawBody) as {
      event?: string
      instance?: string
      data?: {
        key?: {
          remoteJid?: string
          fromMe?: boolean
          id?: string
        }
        message?: {
          conversation?: string
          extendedTextMessage?: { text: string }
          audioMessage?: { url?: string; base64?: string; mimetype?: string }
          imageMessage?: { caption?: string; url?: string }
        }
        messageTimestamp?: number
        pushName?: string
      }
    }

    // Handle connection events (QR scan, connection update)
    if (payload.event === 'connection.update') {
      const status = payload.data?.message?.conversation || ''
      if (status === 'open' || status === 'connected') {
        // Update WhatsAppConnection status
        const instanceName = payload.instance || ''
        await db.whatsAppConnection.updateMany({
          where: { evoInstanceName: instanceName },
          data: { status: 'connected' },
        })
        console.log(`[evo:webhook] Instance ${instanceName} connected`)
      }
      return NextResponse.json({ ok: true })
    }

    // Handle QR code updates (store for admin to scan)
    if (payload.event === 'qrcode.updated') {
      // QR is handled by the instance creation flow
      return NextResponse.json({ ok: true })
    }

    // Handle inbound messages
    if (payload.event !== 'messages.upsert') {
      return NextResponse.json({ ok: true, skipped: 'non-message event' })
    }

    const data = payload.data
    if (!data?.key || !data?.message) {
      return NextResponse.json({ ok: true, skipped: 'invalid payload' })
    }

    // Skip messages sent by the bot itself
    if (data.key.fromMe) {
      return NextResponse.json({ ok: true, skipped: 'fromMe' })
    }

    const remoteJid = data.key.remoteJid || ''
    const providerMsgId = data.key.id || ''

    // --- FILTER STEP (founder doc §8) ---
    // Check for group messages (@g.us suffix) and status broadcasts
    const filterResult = filterInboundMessage({
      from: remoteJid,
      chatId: remoteJid,
      type: 'text',
      body: extractMessageBody(data.message),
      hasMedia: !!data.message.audioMessage || !!data.message.imageMessage,
    })

    if (!filterResult.shouldProcess) {
      // Log filtered message
      await logFilteredMessage(null, filterResult.reason || 'filtered', payload)
      console.log(`[evo:webhook] Filtered message from ${remoteJid}: ${filterResult.reason}`)
      return NextResponse.json({ ok: true, filtered: filterResult.reason })
    }

    // --- DEDUP (founder doc §7) ---
    if (providerMsgId && (await isDuplicateMessage(providerMsgId))) {
      return NextResponse.json({ ok: true, skipped: 'duplicate' })
    }

    // --- RESOLVE CLINIC (founder doc §8) ---
    // The receiving number is the clinic's connected WhatsApp number
    // Evolution sends the instance name — look up clinic via WhatsAppConnection
    const instanceName = payload.instance || ''
    let connection = await db.whatsAppConnection.findFirst({
      where: { evoInstanceName: instanceName, status: 'connected' },
      include: { clinic: true },
    })
    // Fallback: if status='connecting' (connection.update webhook may not have fired yet),
    // still process the message — the instance is clearly working since we received a message on it.
    if (!connection) {
      connection = await db.whatsAppConnection.findFirst({
        where: { evoInstanceName: instanceName, status: { in: ['connecting', 'pairing'] } },
        include: { clinic: true },
      })
      if (connection) {
        // Auto-update to connected since we're receiving messages
        await db.whatsAppConnection.update({
          where: { id: connection.id },
          data: { status: 'connected' },
        })
        console.log(`[evo:webhook] Auto-promoted instance ${instanceName} to connected (message received)`)
      }
    }
    if (!connection || !connection.clinic) {
      console.error(`[evo:webhook] No clinic found for instance ${instanceName}`)
      return NextResponse.json({ ok: true, error: 'clinic not found' }, { status: 404 })
    }

    const clinic = connection.clinic
    if (!clinic.agentEnabled) {
      // Agent is paused — queue message for manual handling (founder doc §7)
      console.log(`[evo:webhook] Agent paused for ${clinic.name}, queuing for manual handling`)
      // Message is still persisted so staff can see it
    }

    // --- EXTRACT MESSAGE ---
    const senderPhone = remoteJid.split('@')[0] // e.g., "923001234567@s.whatsapp.net" → "923001234567"
    const messageBody = extractMessageBody(data.message)
    const isVoice = isVoiceMessage({ type: data.message.audioMessage ? 'audio' : 'text', message: { type: data.message.audioMessage ? 'audio' : 'text' } })
    let voiceAudioBase64 = data.message.audioMessage?.base64
    const voiceMimeType = data.message.audioMessage?.mimetype || 'audio/ogg'

    // Evolution may send only a URL, not base64 — download it
    const voiceUrl = data.message.audioMessage?.url
    if (!voiceAudioBase64 && voiceUrl && isVoice && instanceName) {
      try {
        const { baseUrl, apiKey } = await (await import('@/lib/evolution')).resolveEvoCredentials()
        if (baseUrl && apiKey) {
          const dlRes = await fetch(`${baseUrl}/chat/downloadMedia/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({ message: { key: data.key, message: data.message } }),
          })
          if (dlRes.ok) {
            const dlData = await dlRes.json() as { base64?: string; mimetype?: string }
            if (dlData.base64) voiceAudioBase64 = dlData.base64
          }
        }
      } catch (err) {
        console.warn('[evo:webhook] Failed to download voice media:', err)
      }
    }

    // --- RESOLVE/CREATE PATIENT + CONVERSATION ---
    const phoneHash = hashPhone(senderPhone + clinic.id)
    let patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId: clinic.id, phoneHash } } })
    if (!patient) {
      patient = await db.patient.create({
        data: {
          clinicId: clinic.id,
          phoneHash,
          phoneLast4: senderPhone.slice(-4),
          phone: encryptPhone(senderPhone),
          name: data.pushName || null,
          gender: 'unknown',
          preferredLanguage: 'urdu',
          preferredModality: 'auto',
        },
      })
    }

    let conversation = await db.conversation.findFirst({
      where: { clinicId: clinic.id, patientId: patient.id, status: 'active' },
    })
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          channel: 'evo',
          status: 'active',
          agentPersonaSnapshot: JSON.stringify({ name: clinic.agentName, gender: clinic.agentGender, tone: clinic.agentTone }),
        },
      })
    }

    // --- PERSIST INBOUND MESSAGE ---
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'in',
        type: isVoice ? 'voice' : 'text',
        body: messageBody || (isVoice ? '[Voice note]' : ''),
        providerMsgId,
      },
    })
    const channel = `clinic:${clinic.id}:conversations`
    const inboundEvent = {
      type: 'message_received',
      conversationId: conversation.id,
      direction: 'in',
      body: messageBody,
    }
    await store.publish(channel, inboundEvent)
    // Also broadcast to realtime service (separate process on port 3003)
    void broadcastToRealtime(channel, inboundEvent)

    // --- RUN AGENT (if enabled) ---
    if (!clinic.agentEnabled) {
      // Queue for manual handling — staff will see it in conversations view
      return NextResponse.json({ ok: true, queued: 'agent_paused' })
    }

    const result = await runAgent({
      clinicId: clinic.id,
      patientPhone: senderPhone,
      patientName: patient.name || data.pushName || undefined,
      conversationId: conversation.id,
      userMessage: messageBody || '',
      modality: isVoice ? 'voice' : 'text',
      voiceAudioBase64: voiceAudioBase64,
      voiceMimeType: voiceMimeType,
    })

    // --- PERSIST OUTBOUND MESSAGE ---
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'out',
        type: result.modality === 'voice' ? 'voice' : 'text',
        body: result.reply,
        agentGenderUsed: clinic.agentGender,
        agentLanguageUsed: 'urdu',
        transcript: result.transcript || null,
      },
    })
    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date(), lastIntent: result.toolCalls[0]?.name || 'chat' },
    })
    await store.publish(`clinic:${clinic.id}:conversations`, {
      type: 'message_received',
      conversationId: conversation.id,
      direction: 'out',
      body: result.reply,
    })
    void broadcastToRealtime(`clinic:${clinic.id}:conversations`, {
      type: 'message_received',
      conversationId: conversation.id,
      direction: 'out',
      body: result.reply,
    })

    // --- SEND REPLY VIA EVOLUTION API ---
    if (result.modality === 'voice' && result.voiceReplyBase64) {
      await sendEvolutionVoice(instanceName, senderPhone, result.voiceReplyBase64, 'wav')
    } else {
      await sendEvolutionMessage(instanceName, senderPhone, result.reply)
    }

    return NextResponse.json({ ok: true, processed: true })
  } catch (err) {
    console.error('[evo:webhook] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

/**
 * Extract text body from various Evolution message types.
 */
function extractMessageBody(message: {
  conversation?: string
  extendedTextMessage?: { text: string }
  imageMessage?: { caption?: string }
}): string {
  if (message.conversation) return message.conversation
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text
  if (message.imageMessage?.caption) return message.imageMessage.caption
  return ''
}

/**
 * GET endpoint for webhook verification (some providers require this).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const { apiKey } = await resolveEvoCredentials()
  if (token !== apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, service: 'evolution-webhook' })
}
