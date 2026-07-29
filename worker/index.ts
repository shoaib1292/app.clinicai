/**
 * ClinicAI — Worker Process
 *
 * Supports two modes:
 *   1. Sandbox mode (STORE_TYPE=memory, no Redis): Uses cron scheduler directly
 *   2. Production mode (STORE_TYPE=redis): Uses BullMQ workers with Redis
 *
 * In sandbox mode, pending reminders are processed via polling in the cron scheduler.
 * In production mode, BullMQ workers listen to Redis queues.
 *
 * Run: npx tsx worker/index.ts  (dev)
 * Run: bun  worker/index.ts      (production)
 */

import { db } from '../src/lib/db'
import { sendMetaMessage, decryptMetaToken } from '../src/lib/meta'
import { decryptPhone } from '../src/lib/phone-encryption'

// ============================================================================
// MODE DETECTION
// ============================================================================

const isSandbox = process.env.STORE_TYPE !== 'redis'

// ============================================================================
// SANDBOX MODE — Use cron scheduler directly (no Redis needed)
// ============================================================================

async function runSandboxMode() {
  console.log('========================================')
  console.log('  ClinicAI Worker (SANDBOX MODE)')
  console.log('========================================')
  console.log('  STORE_TYPE=memory — using cron scheduler')
  console.log('  No Redis required. Jobs processed in-process.')
  console.log('========================================')
  console.log('')

  try {
    await db.$connect()
    console.log('[worker] Prisma connected')
  } catch (err) {
    console.error('[worker] Prisma connection failed:', err)
    process.exit(1)
  }

  // Start the cron scheduler — processes pending reminders, nightly analytics, etc.
  const { startCronScheduler } = await import('../src/cron/index')
  const scheduler = startCronScheduler()

  console.log('[worker] Cron scheduler started')
  console.log('  - Reminders:         polled every 60s')
  console.log('  - Analytics:         nightly at 2 AM PKT')
  console.log('  - Retention:         nightly at 2 AM PKT')
  console.log('  - Templates:         daily at 3 AM PKT')
  console.log('  - Feedback requests: hourly')
  console.log('  - Automation events: hourly')
  console.log('')

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[worker] Shutting down...')
    scheduler.stop()
    await db.$disconnect()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

// ============================================================================
// PRODUCTION MODE — Use BullMQ workers with Redis
// ============================================================================

async function runProductionMode() {
  console.log('========================================')
  console.log('  ClinicAI Worker (PRODUCTION MODE)')
  console.log('========================================')
  console.log('  STORE_TYPE=redis — using BullMQ workers')
  console.log('========================================')
  console.log('')

  try {
    await db.$connect()
    console.log('[worker] Prisma connected')
  } catch (err) {
    console.error('[worker] Prisma connection failed:', err)
    process.exit(1)
  }

  // Dynamically import BullMQ workers (they depend on Redis)
  const { Worker, Queue } = await import('bullmq')
  const Redis = (await import('ioredis')).default
  type ConnectionOptions = import('bullmq').ConnectionOptions

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
  const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  }) as unknown as ConnectionOptions

  // Queues (module-level exports moved here for production mode)
  const reminderQueue = new Queue('clinicai-reminders', { connection })
  const analyticsQueue = new Queue('clinicai-analytics', { connection })
  const retentionQueue = new Queue('clinicai-retention', { connection })
  const notificationQueue = new Queue('clinicai-notifications', { connection })

  // Reminder Worker
  const reminderWorker = new Worker('clinicai-reminders', async (job) => {
    const { appointmentId, type } = job.data
    console.log(`[reminder] Processing ${type} for appointment ${appointmentId}`)

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true, clinic: true, slot: true },
    })

    if (!appointment || appointment.status === 'cancelled' || appointment.status === 'no_show') {
      console.warn(`[reminder] Appointment ${appointmentId} not found or ${appointment?.status}, skipping`)
      return
    }

    const clinic = appointment.clinic
    const phone = decryptPhone(appointment.patient.phone)
    const doctorName = appointment.doctor.name
    const timeStr = appointment.slot?.startTime || appointment.start.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    const tokenNo = appointment.slot?.tokenNo

    let message = ''
    if (type === 'reminder_24h') {
      message = `Salam ${appointment.patient.name || 'Patient'}! Ye ${clinic.agentName || 'ClinicAI'} hai. Aapka kal ${appointment.start.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ko ${doctorName} ke saath ${timeStr} baje appointment hai.${tokenNo ? ` Token #${tokenNo}` : ''} Brrahe meharbani time par pohanch jaayein. Shukriya!`
    } else if (type === 'reminder_2h') {
      message = `Salam ${appointment.patient.name || 'Patient'}! Aapka aaj ${doctorName} ke saath ${timeStr} baje appointment hai.${tokenNo ? ` Token #${tokenNo}` : ''} Time par pohanch jaayein. Shukriya!`
    } else if (type === 'reminder_30min') {
      message = `Salam ${appointment.patient.name || 'Patient'}! Aapka ${doctorName} ke saath ${timeStr} baje appointment hai.${tokenNo ? ` Token #${tokenNo}` : ''} Barrahe meharbani pohanch jaayein.`
    } else {
      message = `Salam! Aapka ${doctorName} ke saath ${timeStr} appointment hai.`
    }

    let sent = false
    let error: string | null = null

    try {
      if (clinic.evolutionConnected && clinic.evolutionInstance) {
        const evoUrl = process.env.EVOLUTION_API_URL
        const evoKey = process.env.EVOLUTION_API_KEY
        if (evoUrl && evoKey) {
          const res = await fetch(`${evoUrl}/message/sendText/${clinic.evolutionInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify({ number: phone, text: message }),
          })
          sent = res.ok
          if (!sent) error = `Evolution API error: ${res.status}`
        }
      }

      if (!sent && clinic.metaConnected && clinic.metaPhoneId) {
        const metaToken = clinic.metaTokenEnc ? decryptMetaToken(clinic.metaTokenEnc) : ''
        if (metaToken) {
          const res = await sendMetaMessage(clinic.metaPhoneId, metaToken, phone, message)
          sent = res.ok
          if (!sent) error = `Meta API error: ${res.error || 'unknown'}`
        }
      }

      if (!sent) {
        error = error || 'No WhatsApp channel configured'
      }
    } catch (err: any) {
      error = err.message || String(err)
    }

    await db.reminder.updateMany({
      where: { appointmentId, type, status: 'pending' },
      data: { status: sent ? 'sent' : 'failed', sentAt: sent ? new Date() : null, error },
    })

    console.log(`[reminder] ${type} for ${appointmentId}: ${sent ? 'SENT' : 'FAILED'}`)
  }, { connection, concurrency: 5, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 } })

  reminderWorker.on('completed', (job) => console.log(`[reminder] Job ${job.id} completed`))
  reminderWorker.on('failed', (job, err) => console.error(`[reminder] Job ${job?.id} failed:`, err))

  // Analytics Rollup Worker
  const analyticsWorker = new Worker('clinicai-analytics', async (job) => {
    const { clinicId, date } = job.data
    const targetDate = date ? new Date(date) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    console.log(`[analytics] Running rollup${clinicId ? ` for clinic ${clinicId}` : ' for all clinics'}`)

    const { rollupAllClinics, rollupClinicAnalytics } = await import('../src/lib/analytics-rollup')
    if (clinicId) {
      await rollupClinicAnalytics(clinicId, targetDate)
    } else {
      const result = await rollupAllClinics(targetDate)
      console.log(`[analytics] Rollup complete: ${result.clinics} clinics, ${result.snapshots} snapshots`)
    }
  }, { connection, concurrency: 1, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 } })

  // Retention Worker
  const retentionWorker = new Worker('clinicai-retention', async (job) => {
    const { type } = job.data
    console.log(`[retention] Running ${type}`)
    const { archiveOldConversations, purgeOldConversations, purgeOldPaymentScreenshots } = await import('../src/lib/retention')

    switch (type) {
      case 'archive':
        console.log(`[retention] Archived ${await archiveOldConversations()} conversations`)
        break
      case 'purge_conversations': {
        const result = await purgeOldConversations()
        console.log(`[retention] Purged ${result.total} items`)
        break
      }
      case 'purge_screenshots':
        console.log(`[retention] Purged ${await purgeOldPaymentScreenshots()} payment screenshots`)
        break
      default:
        console.warn(`[retention] Unknown type: ${type}`)
    }
  }, { connection, concurrency: 1, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 } })

  // Notification Worker
  const notificationWorker = new Worker('clinicai-notifications', async (job) => {
    const { channel, recipient, body } = job.data
    const { sendNotification } = await import('../src/lib/notifications')
    try {
      const result = await sendNotification({ channel: channel as any, patientPhone: recipient, body })
      console.log(`[notification] Sent:`, result)
    } catch (err: any) {
      console.error(`[notification] Failed:`, err)
      throw err
    }
  }, { connection, concurrency: 10, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 } })

  // Campaign Worker
  const { campaignWorker } = await import('./campaign-worker')
  const { startAutomationWorker } = await import('./automation-worker')
  const automationWorker = startAutomationWorker()

  // Webhook Worker — processes incoming WhatsApp messages from the queue
  // Group concurrency = 1 per clinicId: replies are strictly sequential per
  // WhatsApp number so instant parallel sends don't trigger bot detection.
  const { registerProductionWorker } = await import('./webhook-worker')
  const webhookWorker = await registerProductionWorker(connection, {
    concurrency: 50,
    group: {
      concurrency: 1,
    },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  })

  console.log('[worker] Workers ready:')
  console.log('  - Reminder worker    (clinicai-reminders)')
  console.log('  - Analytics worker   (clinicai-analytics)')
  console.log('  - Retention worker   (clinicai-retention)')
  console.log('  - Notification worker (clinicai-notifications)')
  console.log('  - Campaign worker    (clinicai-campaigns)')
  console.log('  - Automation worker  (clinicai-automation)')
  console.log('  - Webhook worker     (clinicai-webhook)')

  const shutdown = async () => {
    console.log('\n[worker] Shutting down...')
    await reminderWorker.close()
    await analyticsWorker.close()
    await retentionWorker.close()
    await notificationWorker.close()
    await campaignWorker.close()
    await automationWorker.close()
    await webhookWorker.close()
    await db.$disconnect()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

// ============================================================================
// STARTUP — auto-select mode
// ============================================================================

async function main() {
  if (isSandbox) {
    await runSandboxMode()
  } else {
    await runProductionMode()
  }
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err)
  process.exit(1)
})
