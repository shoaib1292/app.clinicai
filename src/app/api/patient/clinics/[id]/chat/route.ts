/**
 * POST /api/patient/clinics/[id]/chat
 * Send a message to the AI agent for a specific clinic.
 * Wraps runAgent() — same agent used for WhatsApp.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { store } from '@/lib/store'
import { requirePatientAuth } from '@/lib/patient-session'
import { runAgent } from '@/lib/agent'
import { hashPhone, last4 } from '@/lib/auth'
import { encryptPhone } from '@/lib/phone-encryption'
import { ok, err, handle } from '@/lib/api'

async function chat(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clinicId } = await params
  const { appUserId, phoneHash } = await requirePatientAuth(req)

  const body = (await req.json().catch(() => ({}))) as {
    message?: string
    conversationId?: string
    modality?: 'text' | 'voice'
    voiceAudioBase64?: string
  }

  if (!body.message && !body.voiceAudioBase64) return err('message or voiceAudioBase64 required', 400)

  // Verify clinic is attached to this patient (or patient exists at this clinic)
  let patient = await db.patient.findFirst({
    where: { appUserId, clinicId },
  })

  if (!patient) {
    // Patient not yet attached — auto-attach via phoneHash
    patient = await db.patient.findFirst({
      where: { clinicId, phoneHash },
    })
    if (patient && !patient.appUserId) {
      patient = await db.patient.update({
        where: { id: patient.id },
        data: { appUserId },
      })
    }
    if (!patient) {
      // Create new patient record for this clinic
      const appUser = await db.patientAppUser.findUnique({ where: { id: appUserId } })
      patient = await db.patient.create({
        data: {
          clinicId,
          phoneHash,
          phoneLast4: last4(appUser?.phone || ''),
          phone: encryptPhone(appUser?.phone || ''),
          name: null,
          gender: 'unknown',
          preferredLanguage: 'urdu',
          preferredModality: 'auto',
          appUserId,
        },
      })
    }
  }

  const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
  if (!clinic) return err('Clinic not found', 404)
  if (!clinic.agentEnabled) return ok({ reply: `${clinic.agentName} is currently paused.`, toolCalls: [] })

  // Resolve or create conversation
  let conversationId = body.conversationId
  if (!conversationId) {
    const conv = await db.conversation.create({
      data: {
        clinicId,
        patientId: patient.id,
        channel: 'app',
        status: 'active',
        agentPersonaSnapshot: JSON.stringify({ name: clinic.agentName, gender: clinic.agentGender, tone: clinic.agentTone }),
      },
    })
    conversationId = conv.id
  }

  // Persist inbound message
  const inboundType = body.voiceAudioBase64 ? 'voice' : (body.modality === 'voice' ? 'voice' : 'text')
  const inboundBody = body.message || (body.voiceAudioBase64 ? '[Voice note]' : '')
  await db.message.create({
    data: { conversationId, direction: 'in', type: inboundType, body: inboundBody },
  })

  // Run agent
  const agentResult = await runAgent({
    clinicId,
    patientPhone: patient.phone,
    patientName: patient.name || undefined,
    conversationId,
    userMessage: body.message || '',
    modality: body.modality || 'text',
    voiceAudioBase64: body.voiceAudioBase64,
    channel: 'app',
  })

  // Persist outbound message
  const outType = agentResult.modality === 'voice' ? 'voice' : 'text'
  await db.message.create({
    data: {
      conversationId,
      direction: 'out',
      type: outType,
      body: agentResult.reply,
    },
  })

  await db.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date(), lastIntent: agentResult.toolCalls[0]?.name || 'chat' },
  })

  // Publish for realtime
  await store.publish(`clinic:${clinicId}:conversations`, {
    type: 'message_received',
    conversationId,
    direction: 'out',
    body: agentResult.reply,
  }).catch(() => {})

  return ok({
    reply: agentResult.reply,
    toolCalls: agentResult.toolCalls,
    conversationId,
  })
}

export const POST = handle(chat)
