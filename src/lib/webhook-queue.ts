/**
 * Webhook Queue Abstraction.
 *
 * In production (STORE_TYPE=redis), messages are enqueued via BullMQ so the
 * webhook handler returns 200 immediately and the AI agent runs in a Worker.
 * Jobs carry a "cid" (clinicId) group for per-number serialized delivery.
 * In sandbox (STORE_TYPE=memory), we fall back to the store's generic queue
 * but still apply per-patient debounce.
 */
import { store } from './store'
import { db } from './db'
import { debounceMessage, DEBOUNCE_WINDOW_MS } from './message-debounce'

const QUEUE_NAME = 'clinicai-webhook'
const isProduction = process.env.STORE_TYPE === 'redis'

export interface WebhookJob {
  clinicId: string
  patientPhone: string
  patientName?: string
  conversationId: string
  userMessage: string
  modality: 'text' | 'voice'
  voiceAudioBase64?: string
  voiceMimeType?: string
  channel: 'evo' | 'meta'
  instanceName?: string
  phoneNumberId?: string
  accessToken?: string
}

export async function enqueueWebhookJob(job: WebhookJob): Promise<void> {
  // Per-patient debounce: accumulate rapid messages, only enqueue on first.
  const result = await debounceMessage({
    clinicId: job.clinicId,
    patientPhone: job.patientPhone,
    userMessage: job.userMessage,
  })

  if (!result.shouldEnqueue) {
    // Debounce window active — message was appended, no new job needed.
    return
  }

  if (isProduction) {
    try {
      const Redis = (await import('ioredis')).default
      const { Queue } = await import('bullmq')
      const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
      const connection = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      }) as unknown as import('bullmq').ConnectionOptions
      const q = new Queue(QUEUE_NAME, { connection })
      await q.add('process-message', { ...job, groupId: job.clinicId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100,
        delay: DEBOUNCE_WINDOW_MS,
      } as any)
      await q.close()
      connection.disconnect()
    } catch (err) {
      console.error('[webhook-queue] BullMQ enqueue failed:', err)
    }
  } else {
    await store.enqueue(QUEUE_NAME, job)
    // Check if this conversation is taken over (agent paused)
    const pausedKey = `agent:paused:${job.clinicId}:${job.conversationId}`
    const isPaused = await store.get<boolean>(pausedKey)
    if (isPaused) {
      // Agent is paused — don't send AI reply, message has been saved to DB
      console.log(`[webhook-queue] Agent paused for conversation ${job.conversationId} in clinic ${job.clinicId}, skipping auto-reply`)
      return
    }
    // Sandbox: process the job INLINE since there's no separate worker process.
    // This means the webhook response waits until agent processing completes,
    // but ensures the reply actually gets sent.
    processWebhookJobInline(job).catch((e) => {
      console.error('[webhook-queue:inline] Agent processing failed:', e)
    })
  }
}

async function processWebhookJobInline(data: WebhookJob): Promise<void> {
  let reply = ''
  let toolCalls: Array<{ name: string; result: unknown }> = []

  try {
    const agent = await import('./agent')
    const result = await agent.runAgent({
      clinicId: data.clinicId,
      patientPhone: data.patientPhone,
      patientName: data.patientName,
      conversationId: data.conversationId,
      userMessage: data.userMessage,
      modality: data.modality,
      voiceAudioBase64: data.voiceAudioBase64,
      voiceMimeType: data.voiceMimeType,
    })
    reply = result.reply
    toolCalls = result.toolCalls as Array<{ name: string; result: unknown }>
  } catch (e) {
    console.error('[webhook-queue:inline] Agent error, using fallback:', e)
    const clinic = await db.clinic.findUnique({
      where: { id: data.clinicId },
      select: { agentName: true, agentFallback: true },
    })
    reply = clinic?.agentFallback || 'ClinicAI is offline right now. We will get back to you shortly.'
  }

  if (!reply) return

  await db.message.create({
    data: {
      conversationId: data.conversationId,
      direction: 'out',
      type: 'text',
      body: reply,
    },
  })

  await db.conversation.update({
    where: { id: data.conversationId },
    data: { updatedAt: new Date() },
  })

  try {
    await store.publish(`clinic:${data.clinicId}:conversations`, {
      type: 'message_sent',
      conversationId: data.conversationId,
      direction: 'out',
      body: reply,
    })
  } catch {}

  if (data.channel === 'meta' && data.phoneNumberId && data.accessToken) {
    const meta = await import('./meta')
    const res = await meta.sendMetaMessage(data.phoneNumberId, data.accessToken, data.patientPhone, reply)
    if (!res.ok) console.error(`[webhook-queue:inline] Meta send failed:`, res.error)
  } else if (data.instanceName) {
    const evo = await import('./evolution')
    const { getPacingConfig } = await import('./message-pacing')
    const pacing = getPacingConfig(reply, toolCalls)
    const res = await evo.sendEvolutionMessage(data.instanceName, data.patientPhone, reply, {
      typingMs: pacing.typingMs,
    })
    if (!res.ok) console.error(`[webhook-queue:inline] Evo send failed:`, res.error)
  } else {
    console.warn('[webhook-queue:inline] No channel (meta/evo) configured, reply not sent')
  }
}

export { QUEUE_NAME }
