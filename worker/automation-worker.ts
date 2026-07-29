/**
 * Automation Worker — evaluates and executes automation rules.
 * Listens to the `clinicai-automation` BullMQ queue.
 *
 * Flow:
 * 1. Event happens (appointment booked, no-show, cancelled, etc.)
 * 2. API route publishes the event to the queue with context
 * 3. Worker picks it up, evaluates rules against conditions, executes actions
 */
import { Queue, Worker, Job } from 'bullmq'
import { db } from '../src/lib/db'
import { findMatchingRules, EventContext } from '../src/lib/automation-evaluator'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const connection = { url: REDIS_URL }

export const automationQueue = new Queue('clinicai-automation', { connection })

export interface AutomationJobData {
  clinicId: string
  triggerEvent: string
  context: EventContext
}

/**
 * Execute a matched rule's action.
 * Uses the clinic's WhatsApp connection to send via the right channel.
 */
async function executeAction(
  rule: { actionType: string; actionConfig: Record<string, unknown> },
  context: EventContext
): Promise<void> {
  const appointment = context.appointment as Record<string, unknown> | undefined
  const patient = context.patient as Record<string, unknown> | undefined
  const clinicCtx = context.clinic as Record<string, unknown> | undefined
  const phone = (patient?.phone as string) || (appointment?.patientPhone as string)
  if (!phone) return

  switch (rule.actionType) {
    case 'send_template': {
      const templateName = (rule.actionConfig.templateName as string) || 'followup'

      const variables = {
        patient_name: (patient?.name as string) || '',
        appointment_date: (appointment?.start as string) || '',
        appointment_time: (appointment?.startTime as string) || '',
        doctor_name: (context.doctor as Record<string, unknown> | undefined)?.name as string || '',
        clinic_name: (clinicCtx?.name as string) || '',
      }

      const messageBody = buildMessageFromTemplate(templateName, variables)

      // Log the action — actual sending is handled by the reminder worker
      console.log(`[Automation] Would send to ${phone}: ${messageBody.slice(0, 80)}...`)
      break
    }

    case 'transfer_to_human': {
      if (appointment?.conversationId) {
        await db.conversation.update({
          where: { id: appointment.conversationId as string },
          data: {
            takenOverBy: 'system',
            tags: JSON.stringify(['needs_review']),
          },
        })
      }
      break
    }

    case 'webhook': {
      const webhookUrl = rule.actionConfig.webhookUrl as string
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: context }),
        }).catch((err) => console.error(`[Automation] Webhook failed: ${err}`))
      }
      break
    }

    default:
      console.warn(`[Automation] Unknown action type: ${rule.actionType}`)
  }
}

function buildMessageFromTemplate(
  _templateName: string,
  variables: Record<string, string>
): string {
  const { patient_name, appointment_date, appointment_time, doctor_name, clinic_name } = variables

  if (_templateName.includes('rebooking') || _templateName.includes('no_show')) {
    return `Asalamualaikum ${patient_name}! Aap ki ${clinic_name} par ${appointment_date} ko ${appointment_time} baje appointment thi jo miss ho gayi. Dobara booking ke liye WhatsApp karein.`
  }
  if (_templateName.includes('followup')) {
    return `Asalamualaikum ${patient_name}! ${doctor_name} sahab aap ko yaad dila rahe hain — aap ka follow-up due hai. Appointment book karwane ke liye reply karein.`
  }
  if (_templateName.includes('reactivation')) {
    return `Asalamualaikum ${patient_name}! ${clinic_name} par aap ko 90 din se zyada ho gaye. Kya aap nayi appointment book karwana chahein ge?`
  }
  return `Asalamualaikum ${patient_name}! Yeh ${clinic_name} se message hai.`
}

async function incrementExecutionCount(ruleId: string): Promise<void> {
  await db.automationRule.update({
    where: { id: ruleId },
    data: {
      executionCount: { increment: 1 },
      lastExecutedAt: new Date(),
    },
  })
}

/**
 * Initialize and start the automation worker.
 */
export function startAutomationWorker(): Worker<AutomationJobData> {
  const worker = new Worker<AutomationJobData>(
    'clinicai-automation',
    async (job: Job<AutomationJobData>) => {
      const { clinicId, triggerEvent, context } = job.data

      console.log(`[Automation] Evaluating ${triggerEvent} for clinic ${clinicId}`)

      const matchedRules = await findMatchingRules(triggerEvent, context, clinicId)

      if (matchedRules.length === 0) {
        console.log(`[Automation] No matching rules for ${triggerEvent}`)
        return
      }

      for (const rule of matchedRules) {
        console.log(`[Automation] Executing rule: ${rule.name} (action: ${rule.actionType})`)
        await executeAction(rule, context)
        await incrementExecutionCount(rule.id)
      }
    },
    { connection, concurrency: 5 }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Automation] Job ${job?.id} failed:`, err)
  })

  return worker
}
