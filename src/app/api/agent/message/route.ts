import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType } from '@/lib/session'
import { runAgent } from '@/lib/agent'
import { hashPhone } from '@/lib/auth'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

interface Body {
  message: string
  patientPhone?: string
  patientName?: string
  conversationId?: string
  modality?: 'text' | 'voice'
  voiceAudioBase64?: string // base64-encoded audio for voice input
}

async function sendMessage(req: NextRequest) {
  // Allow clinic-scoped users OR platform staff (for testing)
  let clinicId: string
  let bodyRaw: Body & { clinicId?: string }
  try {
    const scope = await requireClinicScope()
    clinicId = scope.clinicId
    bodyRaw = await req.json() as Body & { clinicId?: string }
  } catch {
    try {
      const session = await requireType('platform_admin', 'platform_staff')
      // Platform staff must pass clinicId in body
      bodyRaw = await req.json() as Body & { clinicId?: string }
      clinicId = bodyRaw.clinicId || ''
      if (!clinicId) return err('clinicId required for platform staff', 400)
    } catch {
      return err('Forbidden', 403)
    }
  }

  const body = bodyRaw
  // For voice input, the text message may be empty (we'll transcribe the audio)
  if (!body.message && !body.voiceAudioBase64) return err('message or voiceAudioBase64 required', 400)

  const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
  if (!clinic) return err('Clinic not found', 404)

  if (!clinic.agentEnabled) {
    return ok({ reply: `${clinic.agentName} is currently paused. Please call the clinic directly.`, toolCalls: [], paused: true })
  }

  // Resolve or create conversation + patient
  let conversationId = body.conversationId
  let patientPhone = body.patientPhone || '+923001234599' // test default
  let patientName = body.patientName

  if (patientPhone && !conversationId) {
    const phoneHash = hashPhone(patientPhone + clinicId)
    let patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId, phoneHash } } })
    if (!patient) {
      patient = await db.patient.create({
        data: {
          clinicId, phoneHash, phoneLast4: patientPhone.slice(-4), phone: patientPhone,
          name: patientName, gender: 'unknown', preferredLanguage: 'urdu', preferredModality: 'auto',
        },
      })
    }
    const conv = await db.conversation.create({
      data: {
        clinicId, patientId: patient.id, channel: 'evo', status: 'active',
        agentPersonaSnapshot: JSON.stringify({ name: clinic.agentName, gender: clinic.agentGender, tone: clinic.agentTone }),
      },
    })
    conversationId = conv.id
  }

  // Persist inbound message
  const inboundType = body.voiceAudioBase64 ? 'voice' : (body.modality === 'voice' ? 'voice' : 'text')
  const inboundBody = body.message || (body.voiceAudioBase64 ? '[Voice note]' : '')
  if (conversationId) {
    await db.message.create({
      data: { conversationId, direction: 'in', type: inboundType, body: inboundBody },
    })
    store.publish(`clinic:${clinicId}:conversations`, { type: 'message_received', conversationId, direction: 'in', body: inboundBody })
  }

  // Run the agent (with voice support)
  const result = await runAgent({
    clinicId,
    patientPhone,
    patientName,
    conversationId,
    userMessage: body.message || '',
    modality: body.modality,
    voiceAudioBase64: body.voiceAudioBase64,
  })

  // Persist outbound message
  const outboundType = result.modality === 'voice' ? 'voice' : 'text'
  if (conversationId) {
    await db.message.create({
      data: {
        conversationId, direction: 'out', type: outboundType, body: result.reply,
        agentGenderUsed: clinic.agentGender, agentLanguageUsed: 'urdu',
        transcript: result.transcript || null,
      },
    })
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date(), lastIntent: result.toolCalls[0]?.name || 'chat' },
    })
    store.publish(`clinic:${clinicId}:conversations`, { type: 'message_received', conversationId, direction: 'out', body: result.reply })
  }

  return ok({
    reply: result.reply,
    toolCalls: result.toolCalls,
    conversationId,
    error: result.error,
    modality: result.modality,
    voiceReplyBase64: result.voiceReplyBase64,
    transcript: result.transcript,
  })
}

export const POST = handle(sendMessage)
