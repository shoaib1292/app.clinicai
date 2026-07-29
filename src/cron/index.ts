/**
 * ClinicAI — Cron Scheduler
 *
 * Lightweight periodic job runner for sandbox (no Redis) and production modes.
 * In sandbox mode, jobs are processed in-process directly (no BullMQ required).
 * In production mode, jobs are enqueued to BullMQ queues for the worker process.
 *
 * Run: npx tsx src/cron/index.ts   (standalone)
 * Or imported by worker/index.ts for integrated scheduling.
 */

// Note: Use relative paths instead of @/ aliases since tsx doesn't resolve tsconfig paths
import { db } from '../lib/db'
import { processWebhookQueue } from '../../worker/webhook-worker'
import { sendMetaMessage, decryptMetaToken } from '../lib/meta'
import { decryptPhone } from '../lib/phone-encryption'
import { sendEmail } from '../lib/notifications'

// Store for in-memory queue operations (sandbox mode)
let _store: any = null
async function getStore() {
  if (!_store) {
    const mod = await import('../lib/store')
    _store = mod.store
  }
  return _store
}

// Delayed followup processor (Phase 4)
async function processDelayedFollowups() {
  try {
    const { processDelayedFollowups: runFollowups } = await import('../lib/followup-rules')
    const processed = await runFollowups()
    if (processed > 0) {
      console.log(`[cron:followups] Processed ${processed} delayed follow-ups`)
    }
    return processed
  } catch (err) {
    console.error('[cron:followups] Failed:', err)
    return 0
  }
}

// ── Config ──────────────────────────────────────────────────────────────────
const CHECK_INTERVAL_MS = 60_000 // Check every 60s
const NIGHTLY_HOUR = 2 // 2 AM
const TEMPLATE_SYNC_HOUR = 3 // 3 AM

// ── Sandbox Job Processors (direct execution, no Redis/BullMQ) ─────────────

/**
 * Process pending reminders directly.
 * Queries Reminder table for pending + past-due reminders and sends them.
 */
export async function processPendingReminders(): Promise<number> {
  const now = new Date()
  const pending = await db.reminder.findMany({
    where: {
      status: 'pending',
      sendAt: { lte: now },
    },
    include: {
      appointment: {
        include: {
          patient: true,
          doctor: true,
          clinic: true,
          slot: true,
        },
      },
    },
    take: 50,
  })

  // ── SAFE-SEND GUARDS (Evolution = unofficial WhatsApp, ban risk) ──
  // 1) Per-clinic daily cap — protect clinic's WA number from bulk-ban.
  // Persisted via the store (Redis in prod, in-memory in sandbox) so the cap
  // holds across the whole day, not just a single 60s tick.
  // Cold numbers start at 50/day; raise EVOLUTION_DAILY_CAP only after the
  // number is 2+ weeks old & stable (founder warm-up rule).
  const DAILY_CAP = Number(process.env.EVOLUTION_DAILY_CAP) || 50
  const store = await getStore()
  // Seconds until next Asia/Karachi midnight — counter TTL resets daily.
  function secondsUntilPakistanMidnight(): number {
    const now = new Date()
    const pktNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }))
    const pktMidnight = new Date(pktNow)
    pktMidnight.setHours(24, 0, 0, 0)
    // pktMidnight is the wall-clock PKT midnight. Re-anchor to absolute time:
    const absMidnight = Date.now() + (pktMidnight.getTime() - pktNow.getTime())
    return Math.max(1, Math.ceil((absMidnight - Date.now()) / 1000))
  }
  async function incrementEvolutionCount(clinicId: string): Promise<number> {
    const key = `evolution:daycount:${clinicId}`
    const cur = (await store.get(key)) ?? 0
    const next = cur + 1
    await store.set(key, next, secondsUntilPakistanMidnight())
    return next
  }
  // 2) Inter-send throttle — mimic human pacing, avoid burst detection.
  const SEND_DELAY_MS = Number(process.env.REMINDER_SEND_DELAY_MS) || 3000
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  let sent = 0
  for (const reminder of pending) {
    const appt = reminder.appointment
    if (!appt || appt.status === 'cancelled' || appt.status === 'no_show') {
      await db.reminder.update({
        where: { id: reminder.id },
        data: { status: 'failed', error: `appointment ${appt?.status || 'not_found'}` },
      })
      continue
    }

    const clinic = appt.clinic

    // Email-channel reminders (Brevo) — zero ban risk, used for patients
    // without WA or for clinics that prefer email. NOT counted in WA cap.
    if (reminder.channel === 'email') {
      const email = appt.patient.email
      if (!email) {
        await db.reminder.update({ where: { id: reminder.id }, data: { status: 'failed', error: 'no patient email' } })
        continue
      }
      const doctorName = appt.doctor.name
      const dateStr = appt.start.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const timeStr = appt.slot?.startTime || appt.start.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
      const subject = `${clinic.name} — Appointment Reminder`
      const body = `Dear ${appt.patient.name || 'Patient'},\n\nThis is a reminder of your appointment with Dr. ${doctorName} on ${dateStr} at ${timeStr}.${appt.slot?.tokenNo ? ` Token #${appt.slot.tokenNo}.` : ''}\n\nPlease arrive on time. Thank you,\n${clinic.name} Team`
      const res = await sendEmail(email, subject, body, undefined, { category: 'transactional', clinicId: clinic.id })
      await db.reminder.update({ where: { id: reminder.id }, data: { status: res.ok ? 'sent' : 'failed', sentAt: res.ok ? new Date() : null, error: res.ok ? null : res.error } })
      if (res.ok) sent++
      continue
    }

    // Enforce per-clinic daily cap BEFORE sending over Evolution (WA ban guard).
    if (clinic.evolutionConnected) {
      const count = await incrementEvolutionCount(clinic.id)
      if (count > DAILY_CAP) {
        // Leave as pending so it retries next window; do not exceed cap.
        console.warn(`[reminders] Evolution daily cap (${DAILY_CAP}) reached for clinic ${clinic.id}; deferring.`)
        continue
      }
    }

    const phone = decryptPhone(appt.patient.phone)
    const doctorName = appt.doctor.name
    const timeStr = appt.slot?.startTime || appt.start.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    const tokenNo = appt.slot?.tokenNo

    let message = ''
    if (reminder.type === 'reminder_24h') {
      message = `Salam ${appt.patient.name || 'Patient'}! Ye ${clinic.agentName || 'ClinicAI'} hai. Aapka kal ${appt.start.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ko ${doctorName} ke saath ${timeStr} baje appointment hai.${tokenNo ? ` Token #${tokenNo}` : ''} Barrahe meharbani time par pohanch jaayein. Shukriya!`
    } else if (reminder.type === 'reminder_2h') {
      message = `Salam ${appt.patient.name || 'Patient'}! Aapka aaj ${doctorName} ke saath ${timeStr} baje appointment hai.${tokenNo ? ` Token #${tokenNo}` : ''} Time par pohanch jaayein. Shukriya!`
    } else if (reminder.type === 'reminder_30min') {
      message = `Salam ${appt.patient.name || 'Patient'}! Aapka ${doctorName} ke saath ${timeStr} baje appointment hai.${tokenNo ? ` Token #${tokenNo}` : ''} Barrahe meharbani pohanch jaayein.`
    } else {
      message = `Salam! Aapka ${doctorName} ke saath ${timeStr} appointment hai.`
    }

    let error: string | null = null
    let messageSent = false

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
          messageSent = res.ok
          if (!messageSent) error = `Evolution API error: ${res.status}`
        }
      }

      if (!messageSent && clinic.metaConnected && clinic.metaPhoneId) {
        const metaConn = await db.whatsAppConnection.findFirst({
          where: { clinicId: clinic.id, mode: 'meta', status: 'connected' },
          select: { metaTokenEnc: true },
        })
        const metaToken = metaConn?.metaTokenEnc ? decryptMetaToken(metaConn.metaTokenEnc) : ''
        if (metaToken) {
          const res = await sendMetaMessage(clinic.metaPhoneId, metaToken, phone, message)
          messageSent = res.ok
          if (!messageSent) error = `Meta API error: ${res.error || 'unknown'}`
        }
      }

      if (!messageSent) {
        error = error || 'No WhatsApp channel available'
      }
    } catch (err: any) {
      error = err.message || String(err)
    }

    await db.reminder.update({
      where: { id: reminder.id },
      data: {
        status: messageSent ? 'sent' : 'failed',
        sentAt: messageSent ? new Date() : null,
        error,
      },
    })

    if (messageSent) sent++

    // Throttle before next send (Evolution ban-guard).
    if (pending.length > 1) await sleep(SEND_DELAY_MS)
  }

  if (pending.length > 0) {
    console.log(`[cron:reminders] Processed ${pending.length} reminders, ${sent} sent`)
  }

  return sent
}

/**
 * Run nightly analytics rollup for all clinics.
 */
export async function runNightlyAnalytics(): Promise<number> {
  try {
    // Dynamic import with relative path for standalone execution
    const { runNightlyRollup } = await import('../lib/analytics-rollup')
    const result = await runNightlyRollup()
    console.log(`[cron:analytics] Rollup complete: ${result.clinics} clinics, ${result.snapshots} snapshots`)
    return result.snapshots
  } catch (err) {
    console.error('[cron:analytics] Rollup failed:', err)
    return 0
  }
}

/**
 * Run nightly data retention (archive old conversations, purge old data).
 */
export async function runNightlyRetention(): Promise<{ archived: number; purged: number }> {
  try {
    const { archiveOldConversations, purgeOldConversations, purgeOldPaymentScreenshots } = await import('../lib/retention')

    const archived = await archiveOldConversations()
    console.log(`[cron:retention] Archived ${archived} conversations`)

    const purgeResult = await purgeOldConversations()
    console.log(`[cron:retention] Purged ${purgeResult.total} items (${purgeResult.conversations} conversations, ${purgeResult.messages} messages)`)

    const screenshotsPurged = await purgeOldPaymentScreenshots()
    console.log(`[cron:retention] Purged ${screenshotsPurged} payment screenshots`)

    return { archived, purged: purgeResult.total + screenshotsPurged }
  } catch (err) {
    console.error('[cron:retention] Retention failed:', err)
    return { archived: 0, purged: 0 }
  }
}

/**
 * Process feedback requests for completed appointments without feedback.
 * Sends WhatsApp message with feedback link 1+ hours after completion.
 */
export async function processFeedbackRequests(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const completedAppts = await db.appointment.findMany({
    where: {
      status: 'completed',
      checkInTime: { gte: oneDayAgo, lte: oneHourAgo },
      feedback: null,
      clinic: { agentEnabled: true },
    },
    include: {
      patient: { select: { name: true, phone: true } },
      doctor: { select: { name: true } },
      clinic: { select: { id: true, name: true, agentName: true, evolutionConnected: true, evolutionInstance: true, metaConnected: true, metaPhoneId: true } },
    },
    take: 50,
  })

  let sent = 0
  for (const appt of completedAppts) {
    const clinic = appt.clinic
    const patientName = appt.patient.name || 'Patient'
    const doctorName = appt.doctor.name
    const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinicai.pk'}/feedback/${appt.id}`

    const message =
      `Asalamualaikum ${patientName}! Aap ki ${clinic.name} par ${doctorName} sahab se appointment complete ho gayi. ` +
      `Kya aap apna feedback de sakte hain? Yeh raha link:\n${feedbackUrl}\n\nShukriya!`

    let messageSent = false
    let error: string | null = null

    try {
      const phone = decryptPhone(appt.patient.phone)
      if (!phone) continue

      // Try Evolution API first
      if (clinic.evolutionConnected && clinic.evolutionInstance) {
        const evoUrl = process.env.EVOLUTION_API_URL
        const evoKey = process.env.EVOLUTION_API_KEY
        if (evoUrl && evoKey) {
          const res = await fetch(`${evoUrl}/message/sendText/${clinic.evolutionInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify({ number: phone, text: message }),
          })
          messageSent = res.ok
          if (!messageSent) error = `Evolution error: ${res.status}`
        }
      }

      // Fallback to Meta API
      if (!messageSent && clinic.metaConnected && clinic.metaPhoneId) {
        const metaConn = await db.whatsAppConnection.findFirst({
          where: { clinicId: clinic.id, mode: 'meta', status: 'connected' },
          select: { metaTokenEnc: true },
        })
        const metaToken = metaConn?.metaTokenEnc ? decryptMetaToken(metaConn.metaTokenEnc) : ''
        if (metaToken) {
          const res = await sendMetaMessage(clinic.metaPhoneId, metaToken, phone, message)
          messageSent = res.ok
          if (!messageSent) error = `Meta error: ${res.error || 'unknown'}`
        }
      }

      if (messageSent) {
        sent++
        console.log(`[feedback] Sent feedback request for appointment ${appt.id}`)
      } else {
        console.warn(`[feedback] Failed to send for ${appt.id}: ${error || 'No channel'}`)
      }
    } catch (err: any) {
      console.error(`[feedback] Error sending for ${appt.id}:`, err)
    }
  }

  if (completedAppts.length > 0) {
    console.log(`[feedback] Processed ${completedAppts.length} appointments, ${sent} feedback requests sent`)
  }

  return sent
}

/**
 * Evaluate pending automation rules against recent events.
 * Checks for events queued in the store and evaluates matching rules.
 */
export async function processAutomationEvents(): Promise<number> {
  let processed = 0

  try {
    // Import dynamically to avoid circular dependencies
    const { evaluateCondition } = await import('../lib/automation-evaluator')

    // Dequeue pending automation events from the in-memory queue
    const store = await getStore()
    let event
    while ((event = await store.dequeue('automation:events')) !== null) {
      const { clinicId, triggerEvent, context } = event.data as {
        clinicId: string
        triggerEvent: string
        context: Record<string, unknown>
      }

      // Find matching rules for this trigger event
      const rules = await db.automationRule.findMany({
        where: {
          clinicId,
          triggerEvent,
          enabled: true,
          deletedAt: null,
        },
        orderBy: { priority: 'asc' },
      })

      for (const rule of rules) {
        // Skip if max execution count reached
        if (rule.maxExecutions > 0 && rule.executionCount >= rule.maxExecutions) continue

        // Evaluate conditions
        let conditions
        try {
          conditions = JSON.parse(rule.conditions)
        } catch {
          continue
        }

        const matches = evaluateCondition(conditions, context as any)
        if (!matches) continue

        console.log(`[automation] Executing rule "${rule.name}" for ${triggerEvent}`)

        // Execute the action based on actionType
        const actionConfig = JSON.parse(rule.actionConfig || '{}')
        const patient = context.patient as Record<string, unknown> | undefined
        const phone = patient?.phone as string | undefined

        switch (rule.actionType) {
          case 'send_template': {
            if (!phone) break
            const messageText =
              `Asalamualaikum ${patient?.name || 'Patient'}! Yeh ${context.clinic_name || ''} clinic se message hai.` +
              (triggerEvent === 'appointment.no_show'
                ? ' Aap ki appointment miss ho gayi. Dobara booking ke liye WhatsApp karein.'
                : triggerEvent === 'appointment.booked'
                ? ' Aap ki appointment confirm ho gayi. Shukriya!'
                : '')

            const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
            if (!clinic) break

            if (clinic.evolutionConnected && clinic.evolutionInstance) {
              const evoUrl = process.env.EVOLUTION_API_URL
              const evoKey = process.env.EVOLUTION_API_KEY
              if (evoUrl && evoKey) {
                fetch(`${evoUrl}/message/sendText/${clinic.evolutionInstance}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
                  body: JSON.stringify({ number: phone, text: messageText }),
                }).catch(() => {})
              }
            }
            break
          }

          case 'transfer_to_human': {
            const conversationId = context.conversationId as string | undefined
            if (conversationId) {
              await db.conversation.update({
                where: { id: conversationId },
                data: {
                  takenOverBy: 'system',
                  tags: JSON.stringify(['needs_review']),
                  lastIntent: 'transferred_by_rule',
                },
              })
            }
            break
          }

          case 'webhook': {
            const webhookUrl = actionConfig.webhookUrl as string
            if (webhookUrl) {
              fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triggerEvent, context }),
              }).catch(() => {})
            }
            break
          }
        }

        // Update execution count
        await db.automationRule.update({
          where: { id: rule.id },
          data: {
            executionCount: { increment: 1 },
            lastExecutedAt: new Date(),
          },
        })

        processed++
      }
    }
  } catch (err) {
    console.error('[automation] Processing failed:', err)
  }

  return processed
}

/**
 * Sync Meta templates for all clinics with active Meta connections.
 */
export async function syncMetaTemplates(): Promise<number> {
  try {
    const { syncAllClinicTemplates } = await import('../lib/meta-template-sync')
    const result = await syncAllClinicTemplates()
    console.log(`[cron:templates] Synced ${result.total} templates, ${result.errors} errors`)
    return result.total
  } catch (err) {
    console.error('[cron:templates] Sync failed:', err)
    return 0
  }
}

// ── Scheduler ───────────────────────────────────────────────────────────────

interface ScheduledJob {
  name: string
  interval: 'hourly' | 'nightly' | 'daily'
  run: () => Promise<unknown>
  lastRun: number
}

const jobs: ScheduledJob[] = [
  {
    name: 'reminders',
    interval: 'hourly',
    run: processPendingReminders,
    lastRun: 0,
  },
  {
    name: 'analytics',
    interval: 'nightly',
    run: runNightlyAnalytics,
    lastRun: 0,
  },
  {
    name: 'self-learning',
    interval: 'nightly',
    run: async () => {
      const { runAllClinicLearning } = await import('../lib/agent/self-learning')
      const r = await runAllClinicLearning()
      console.log(`[cron:self-learning] Learned ${r.patients} patients across ${r.clinics} clinics`)
      return r
    },
    lastRun: 0,
  },
  {
    name: 'retention',
    interval: 'nightly',
    run: runNightlyRetention,
    lastRun: 0,
  },
  {
    name: 'meta-templates',
    interval: 'daily',
    run: syncMetaTemplates,
    lastRun: 0,
  },
  {
    name: 'feedback-requests',
    interval: 'hourly',
    run: processFeedbackRequests,
    lastRun: 0,
  },
  {
    name: 'automation-events',
    interval: 'hourly',
    run: processAutomationEvents,
    lastRun: 0,
  },
  {
    name: 'delayed-followups',
    interval: 'hourly',
    run: processDelayedFollowups,
    lastRun: 0,
  },
  {
    name: 'webhook-queue',
    interval: 'hourly',
    run: processWebhookQueue,
    lastRun: 0,
  },
]

function getHour(): number {
  // Pakistan time (UTC+5)
  const now = new Date()
  return (now.getUTCHours() + 5) % 24
}

function shouldRun(job: ScheduledJob): boolean {
  const now = Date.now()
  const hour = getHour()

  // Don't run if already ran in the last hour
  if (now - job.lastRun < 60 * 60 * 1000) return false

  switch (job.interval) {
    case 'hourly':
      return true
    case 'nightly':
      return hour === NIGHTLY_HOUR
    case 'daily':
      return hour === TEMPLATE_SYNC_HOUR
    default:
      return false
  }
}

/**
 * Start the cron scheduler loop.
 * Runs until the process exits or `stop()` is called.
 */
export function startCronScheduler(intervalMs: number = CHECK_INTERVAL_MS): { stop: () => void } {
  console.log(`[cron] Starting scheduler (check interval: ${intervalMs}ms)`)

  const tick = async () => {
    for (const job of jobs) {
      if (shouldRun(job)) {
        console.log(`[cron] Running job: ${job.name}`)
        try {
          await job.run()
          job.lastRun = Date.now()
        } catch (err) {
          console.error(`[cron] Job ${job.name} failed:`, err)
        }
      }
    }
  }

  // Run immediately on start
  tick()

  const interval = setInterval(tick, intervalMs)
  return {
    stop: () => {
      clearInterval(interval)
      console.log('[cron] Scheduler stopped')
    },
  }
}

// ── CLI Entrypoint ──────────────────────────────────────────────────────────

// Use process.argv check (works with both CJS and ESM/tsx)
if (process.argv[1]?.endsWith('cron/index.ts') || process.argv[1]?.endsWith('cron/index')) {
  console.log('========================================')
  console.log('  ClinicAI Cron Scheduler')
  console.log('========================================')
  console.log(`  Check interval: ${CHECK_INTERVAL_MS}ms`)
  console.log(`  Nightly hour:   ${NIGHTLY_HOUR}:00 PKT`)
  console.log(`  Template sync:  ${TEMPLATE_SYNC_HOUR}:00 PKT`)
  console.log('========================================')
  console.log('')

  const scheduler = startCronScheduler()

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[cron] Shutting down...')
    scheduler.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
