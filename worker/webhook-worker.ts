import { db } from '../src/lib/db'
import { store } from '../src/lib/store'
import { runAgent } from '../src/lib/agent'
import { sendEvolutionMessage, sendEvolutionVoice } from '../src/lib/evolution'
import { sendMetaMessage, sendMetaAudio } from '../src/lib/meta'
import { flushAccumulator } from '../src/lib/message-debounce'
import { getPacingConfig } from '../src/lib/message-pacing'
import type { WebhookJob } from '../src/lib/webhook-queue'
import { QUEUE_NAME } from '../src/lib/webhook-queue'

// ── WhatsApp ban guard for live agent replies ──────────────────────────────
// WARM-UP STRATEGY: Daily cap grows per week to mimic natural clinic growth.
// Meta/WhatsApp detects sudden spikes — gradual ramp avoids ban flags.
//   Week 1:  50/day   (new number, low trust)
//   Week 2: 100/day
//   Week 3: 200/day
//   Week 4: 300/day
//   Week 5: 500/day
//   Week 6+: unlimited (number is trusted)
// Per-patient hourly cap remains to prevent spam-feeling bursts.
const EVO_PER_PATIENT_HOURLY_CAP = Number(process.env.EVO_PER_PATIENT_HOURLY_CAP) || 8

async function getWarmUpDailyCap(clinicId: string): Promise<number> {
  // Look up when this connection was first created
  const conn = await db.whatsAppConnection.findFirst({
    where: { clinicId, mode: 'evo', status: 'connected' },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!conn) return 50 // default — should not happen

  const now = Date.now()
  const ageDays = (now - conn.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  const ageWeeks = Math.floor(ageDays / 7)

  const WARM_UP_SCHEDULE: Record<number, number> = {
    0: 50,   // week 1
    1: 100,  // week 2
    2: 200,  // week 3
    3: 300,  // week 4
    4: 500,  // week 5
  }
  // After week 5: return 0 (unlimited)
  if (ageWeeks > 4) return 0
  return WARM_UP_SCHEDULE[ageWeeks] ?? 50
}

async function agentReplyEvolutionGuard(clinicId: string, patientPhone: string): Promise<{ ok: boolean; reason?: string }> {
  const now = Date.now()

  // Per-patient hourly cap (prevents a single conversation from spamming).
  const pHourKey = `evolution:pp:${clinicId}:${patientPhone}:${Math.floor(now / 3600000)}`
  const pCount = (await store.get<number>(pHourKey)) ?? 0
  if (pCount >= EVO_PER_PATIENT_HOURLY_CAP) {
    return { ok: false, reason: 'per_patient_hourly_cap' }
  }

  // Warm-up daily cap
  const dailyCap = await getWarmUpDailyCap(clinicId)
  const countKey = `evolution:daycount:${clinicId}`
  const cur = (await store.get<number>(countKey)) ?? 0
  const next = cur + 1
  if (dailyCap > 0 && next > dailyCap) {
    return { ok: false, reason: `daily_cap_warmup_${dailyCap}` }
  }

  const pktMidnight = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }))
  pktMidnight.setHours(24, 0, 0, 0)
  const ttl = Math.max(1, Math.ceil((pktMidnight.getTime() - Date.now()) / 1000))
  await store.set(pHourKey, pCount + 1, 3600)
  await store.set(countKey, next, ttl)
  return { ok: true }
}

async function processWebhookJob(job: { data: WebhookJob }) {
  const data = job.data
  const patientPhone = data.patientPhone

  // ── DEBOUNCE FLUSH ────────────────────────────────────────────────
  // The webhook enqueued a delayed job. Before calling the agent, read the
  // accumulated messages from the debounce store so the agent gets all rapid
  // messages as a single combined context.
  const combinedMessage = await flushAccumulator(data.clinicId, patientPhone)
  const userMessage = combinedMessage || data.userMessage

  console.log(`[webhook-worker] Processing from ${patientPhone} (${data.channel}) ${combinedMessage ? `[combined ${combinedMessage.split('\n').length} msgs]` : ''}`)

  try {
    const result = await runAgent({
      clinicId: data.clinicId,
      patientPhone: data.patientPhone,
      patientName: data.patientName,
      conversationId: data.conversationId,
      userMessage,
      modality: data.modality,
      voiceAudioBase64: data.voiceAudioBase64,
      voiceMimeType: data.voiceMimeType,
    })

    // Persist outbound message
    await db.message.create({
      data: {
        conversationId: data.conversationId,
        direction: 'out',
        type: result.modality === 'voice' ? 'voice' : 'text',
        body: result.reply,
        agentGenderUsed: undefined,
        agentLanguageUsed: 'urdu',
        transcript: result.transcript || null,
      },
    })

    await db.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date(), lastIntent: result.toolCalls[0]?.name || 'chat' },
    })

    // Resolve clinic for conversation event
    const conv = await db.conversation.findUnique({ where: { id: data.conversationId }, select: { clinicId: true } })
    if (conv) {
      await store.publish(`clinic:${conv.clinicId}:conversations`, {
        type: 'message_received',
        conversationId: data.conversationId,
        direction: 'out',
        body: result.reply,
      })
    }

    // ── PACING ──────────────────────────────────────────────────────
    // Compute word-count-based typing delay. Triage/escalation gets minimal delay.
    const pacing = getPacingConfig(result.reply, result.toolCalls as Array<{ name: string; result: unknown }>)

    // Send reply via appropriate channel
    if (data.channel === 'evo' && data.instanceName) {
      const guard = await agentReplyEvolutionGuard(data.clinicId, patientPhone)
      if (!guard.ok) {
        console.warn(`[webhook-worker] Skipping Evolution reply for clinic ${data.clinicId} / ${patientPhone}: ${guard.reason}`)
      } else if (result.modality === 'voice' && result.voiceReplyBase64) {
        const fmt = (result as { voiceReplyFormat?: string }).voiceReplyFormat
        await sendEvolutionVoice(data.instanceName, patientPhone, result.voiceReplyBase64, (fmt === 'mp3' || fmt === 'ogg') ? fmt : 'wav')
      } else {
        await sendEvolutionMessage(data.instanceName, patientPhone, result.reply, {
          typingMs: pacing.typingMs,
        })
      }
    } else if (data.channel === 'meta' && data.phoneNumberId && data.accessToken) {
      if (result.modality === 'voice' && result.voiceReplyBase64) {
        const fmt = (result as { voiceReplyFormat?: string }).voiceReplyFormat
        await sendMetaAudio(data.phoneNumberId, data.accessToken, patientPhone, result.voiceReplyBase64, (fmt === 'mp3' || fmt === 'ogg') ? fmt : 'wav')
      } else {
        await sendMetaMessage(data.phoneNumberId, data.accessToken, patientPhone, result.reply)
      }
    }
  } catch (err) {
    console.error('[webhook-worker] Failed to process message:', err)
    throw err
  }
}

// Production mode: BullMQ worker registration (called from worker/index.ts)
export async function registerProductionWorker(connection: import('bullmq').ConnectionOptions, workerOptions?: Record<string, unknown>) {
  const { Worker } = await import('bullmq')
  return new Worker(QUEUE_NAME, processWebhookJob, { connection, ...workerOptions })
}

// Sandbox mode: process queued jobs via the store abstraction
// Called from src/cron/index.ts periodically
export async function processWebhookQueue(): Promise<number> {
  let processed = 0
  let job = await store.dequeue(QUEUE_NAME)
  while (job) {
    try {
      await processWebhookJob({ data: job.data as WebhookJob })
      processed++
    } catch (err) {
      console.error('[webhook-worker] sandbox job failed:', err)
    }
    job = await store.dequeue(QUEUE_NAME)
  }
  return processed
}

export { QUEUE_NAME }
