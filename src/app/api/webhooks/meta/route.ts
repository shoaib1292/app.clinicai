import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { hashPhone } from '@/lib/auth'
import { runAgent } from '@/lib/agent'
import { filterInboundMessage, logFilteredMessage, isDuplicateMessage } from '@/lib/filter'
import { sendMetaMessage, sendMetaAudio, verifyMetaSignature, getMetaVerifyToken, decryptMetaToken } from '@/lib/meta'
import { isVoiceMessage } from '@/lib/voice'

/**
 * Meta Cloud API Webhook — receives inbound WhatsApp messages + status updates.
 * Per founder doc §6: Meta is used for proactive reminders/broadcasts AND
 * conversational replies when clinic uses Meta-only mode.
 *
 * Webhook events: messages, message_status, template_status_update
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256') || ''

    // Verify signature (founder doc §34: "webhooks verified via Meta X-Hub-Signature-256 HMAC")
    const appSecret = process.env.META_APP_SECRET || ''
    if (appSecret && !verifyMetaSignature(rawBody, signature, appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody) as {
      object?: string
      entry?: Array<{
        id?: string
        changes?: Array<{
          value?: {
            messaging_product?: string
            metadata?: { phone_number_id?: string; display_phone_number?: string }
            messages?: Array<{
              id: string
              from: string
              type: string
              text?: { body: string }
              audio?: { id: string; mime_type: string }
              image?: { id: string; caption?: string }
              timestamp: string
              context?: { from: string; id: string }
            }>
            statuses?: Array<{
              id: string
              status: string
              timestamp: string
              recipient_id: string
            }>
          }
          field?: string
        }>
      }>
    }

    // Handle status updates (delivered, read, failed)
    const entry = payload.entry?.[0]
    const change = entry?.changes?.[0]
    if (change?.value?.statuses && change.value.statuses.length > 0) {
      for (const status of change.value.statuses) {
        console.log(`[meta:webhook] Message ${status.id} status: ${status.status}`)
        // Could update message delivery status in DB here
      }
      return NextResponse.json({ ok: true })
    }

    // Handle inbound messages
    const messages = change?.value?.messages
    if (!messages || messages.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'no messages' })
    }

    const phoneNumberId = change?.value?.metadata?.phone_number_id || ''
    const displayNumber = change?.value?.metadata?.display_phone_number || ''

    // --- RESOLVE CLINIC ---
    // Find clinic by WhatsAppConnection with this phone number
    const connection = await db.whatsAppConnection.findFirst({
      where: { phone: displayNumber, mode: { in: ['meta', 'both'] } },
      include: { clinic: true },
    })
    if (!connection || !connection.clinic) {
      console.error(`[meta:webhook] No clinic found for number ${displayNumber}`)
      return NextResponse.json({ ok: true, error: 'clinic not found' }, { status: 404 })
    }

    const clinic = connection.clinic

    for (const msg of messages) {
      const senderPhone = msg.from
      const providerMsgId = msg.id

      // --- FILTER STEP ---
      // Meta doesn't send group/status the same way, but we still check
      const messageBody = msg.text?.body || msg.image?.caption || ''
      const isVoice = msg.type === 'audio'

      const filterResult = filterInboundMessage({
        from: senderPhone,
        type: msg.type,
        body: messageBody,
        hasMedia: !!msg.audio || !!msg.image,
      })

      if (!filterResult.shouldProcess) {
        await logFilteredMessage(clinic.id, filterResult.reason || 'filtered', msg)
        continue
      }

      // --- DEDUP ---
      if (isDuplicateMessage(providerMsgId)) {
        continue
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
            phone: senderPhone,
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
            channel: 'meta',
            status: 'active',
            agentPersonaSnapshot: JSON.stringify({ name: clinic.agentName, gender: clinic.agentGender, tone: clinic.agentTone }),
          },
        })
      }

      // --- PERSIST INBOUND ---
      await db.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'in',
          type: isVoice ? 'voice' : 'text',
          body: messageBody || (isVoice ? '[Voice note]' : ''),
          providerMsgId,
        },
      })
      store.publish(`clinic:${clinic.id}:conversations`, {
        type: 'message_received',
        conversationId: conversation.id,
        direction: 'in',
        body: messageBody,
      })

      // --- RUN AGENT ---
      if (!clinic.agentEnabled) {
        continue
      }

      // For voice messages, we'd need to download the audio from Meta's media endpoint
      // then convert to base64. For now, we pass empty and let the agent handle gracefully.
      const voiceAudioBase64 = isVoice ? undefined : undefined // Media download would go here

      const result = await runAgent({
        clinicId: clinic.id,
        patientPhone: senderPhone,
        patientName: patient.name || undefined,
        conversationId: conversation.id,
        userMessage: messageBody || '',
        modality: isVoice ? 'voice' : 'text',
        voiceAudioBase64,
      })

      // --- PERSIST OUTBOUND ---
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
      store.publish(`clinic:${clinic.id}:conversations`, {
        type: 'message_received',
        conversationId: conversation.id,
        direction: 'out',
        body: result.reply,
      })

      // --- SEND REPLY VIA META API ---
      const accessToken = connection.metaTokenEnc ? decryptMetaToken(connection.metaTokenEnc) : ''
      if (accessToken) {
        if (result.modality === 'voice' && result.voiceReplyBase64) {
          await sendMetaAudio(phoneNumberId, accessToken, senderPhone, result.voiceReplyBase64, 'wav')
        } else {
          await sendMetaMessage(phoneNumberId, accessToken, senderPhone, result.reply)
        }
      }
    }

    return NextResponse.json({ ok: true, processed: true })
  } catch (err) {
    console.error('[meta:webhook] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

/**
 * GET endpoint for Meta webhook verification (founder doc §37 step 10).
 * Meta sends a GET request with hub.mode, hub.verify_token, hub.challenge
 * to verify the webhook URL during setup.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === getMetaVerifyToken()) {
    console.log('[meta:webhook] Verification successful')
    return new NextResponse(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}
