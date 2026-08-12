/**
 * Post-Appointment Follow-Up Automation Rules
 *
 * Pre-built automation rules for post-appointment follow-up campaigns.
 * Registered per-clinic on signup or via the automation rules UI.
 *
 * These use the automation-evaluator condition engine (Phase 2)
 * to trigger WhatsApp follow-up messages based on appointment events.
 */
import { sendMetaMessage, decryptMetaToken } from './meta'
import { decryptPhone } from './phone-encryption'

/**
 * Default follow-up rules that should be created for every new clinic.
 * These provide out-of-the-box post-appointment automation.
 */
export const DEFAULT_FOLLOWUP_RULES = [
  {
    name: 'No-Show Rebooking',
    triggerEvent: 'appointment.no_show',
    conditions: JSON.stringify({
      and: [
        { field: 'appointment.status', op: 'eq', value: 'no_show' },
      ],
    }),
    actionType: 'send_template',
    actionConfig: JSON.stringify({
      templateName: 'no_show_followup',
      delayMinutes: 120, // Send 2 hours after no-show
      personalization: {
        message: 'Asalamualaikum {patient_name}! Aap ki {doctor_name} sahab se {appointment_date} ko appointment thi jo miss ho gayi. Kya aap dobara appointment book karwana chahein ge?',
      },
    }),
    priority: 10,
    maxExecutions: 2, // Max 2 follow-ups per patient
  },
  {
    name: 'Post-Completion Feedback',
    triggerEvent: 'appointment.completed',
    conditions: JSON.stringify({
      and: [
        { field: 'appointment.status', op: 'eq', value: 'completed' },
      ],
    }),
    actionType: 'send_template',
    actionConfig: JSON.stringify({
      templateName: 'feedback_request',
      delayMinutes: 60, // Send 1 hour after completion
      personalization: {
        message: 'Asalamualaikum {patient_name}! Aap ki {doctor_name} sahab se appointment complete ho gayi. Kya aap apna feedback de sakte hain? Feedback link: {feedback_url}',
      },
    }),
    priority: 20,
    maxExecutions: 1,
  },
  {
    name: '7-Day Follow-Up',
    triggerEvent: 'appointment.completed',
    conditions: JSON.stringify({
      and: [
        { field: 'appointment.status', op: 'eq', value: 'completed' },
      ],
    }),
    actionType: 'send_template',
    actionConfig: JSON.stringify({
      templateName: 'followup_7d',
      delayMinutes: 10080, // 7 days in minutes
      personalization: {
        message: 'Asalamualaikum {patient_name}! Aap ko {doctor_name} sahab ne dawai di thi. Kya dawa khatam hui? Dobara appointment leni hai to humein batayein.',
      },
    }),
    priority: 30,
    maxExecutions: 1,
  },
  {
    name: '30-Day Checkup Reminder',
    triggerEvent: 'appointment.completed',
    conditions: JSON.stringify({
      and: [
        { field: 'appointment.status', op: 'eq', value: 'completed' },
      ],
    }),
    actionType: 'send_template',
    actionConfig: JSON.stringify({
      templateName: 'checkup_30d',
      delayMinutes: 43200, // 30 days in minutes
      personalization: {
        message: 'Asalamualaikum {patient_name}! Aap ki 30 din pehle {doctor_name} sahab se appointment hui thi. Annual checkup ka waqt aa gaya hai. Naye appointment ke liye reply karein.',
      },
    }),
    priority: 40,
    maxExecutions: 1,
  },
  {
    name: 'Dormant Patient Reactivation',
    triggerEvent: 'patient.dormant_90d',
    conditions: JSON.stringify({
      and: [
        { field: 'patient.lastVisitDays', op: 'gte', value: 90 },
      ],
    }),
    actionType: 'send_template',
    actionConfig: JSON.stringify({
      templateName: 'reactivation',
      delayMinutes: 0,
      personalization: {
        message: 'Asalamualaikum {patient_name}! {clinic_name} par aap ko 90 din se zyada ho gaye. Kya aap nayi appointment book karwana chahein ge? Aap ke liye special discount available hai!',
      },
    }),
    priority: 50,
    maxExecutions: 1,
  },
]

/**
 * Register default follow-up rules for a clinic.
 * Called on clinic creation/signup to provide out-of-the-box automation.
 */
export async function registerDefaultFollowupRules(clinicId: string): Promise<number> {
  const { db } = await import('./db')
  let created = 0

  for (const rule of DEFAULT_FOLLOWUP_RULES) {
    // Check if rule already exists (by name + clinicId)
    const existing = await db.automationRule.findFirst({
      where: { clinicId, name: rule.name, deletedAt: null },
    })
    if (existing) continue

    await db.automationRule.create({
      data: {
        clinicId,
        name: rule.name,
        enabled: true,
        conditions: rule.conditions,
        actionType: rule.actionType,
        actionConfig: rule.actionConfig,
        triggerEvent: rule.triggerEvent,
        priority: rule.priority,
        maxExecutions: rule.maxExecutions,
      },
    })
    created++
  }

  return created
}

/**
 * Process delayed follow-up actions from automation events.
 * Called by the cron scheduler to execute time-delayed automations.
 */
export async function processDelayedFollowups(): Promise<number> {
  const { db } = await import('./db')
  const now = new Date()

  // Find automation rules that have pending delayed actions
  // This checks rules that were triggered but their delay hasn't elapsed yet
  // The delayed execution is tracked via the executionTime in the rule
  const rules = await db.automationRule.findMany({
    where: {
      enabled: true,
      deletedAt: null,
      triggerEvent: {
        in: ['appointment.completed', 'appointment.no_show', 'patient.dormant_90d'],
      },
    },
  })

  let processed = 0

  for (const rule of rules) {
    const actionConfig = JSON.parse(rule.actionConfig || '{}')
    const delayMinutes = actionConfig.delayMinutes || 0
    if (delayMinutes <= 0) continue // No delay — handled by processAutomationEvents

    // Find eligible recent trigger events that haven't had follow-up yet
    // For appointment.completed, find completed appointments with no feedback
    // For appointment.no_show, find recent no-shows
    if (rule.triggerEvent === 'appointment.completed' && rule.name === 'Post-Completion Feedback') {
      const cutoff = new Date(now.getTime() - delayMinutes * 60 * 1000)
      const completedAppts = await db.appointment.findMany({
        where: {
          clinicId: rule.clinicId,
          status: 'completed',
          checkInTime: { lte: cutoff },
          feedback: null,
        },
        include: {
          patient: { select: { name: true, phone: true } },
          doctor: { select: { name: true } },
        },
        take: 20,
      })

      for (const appt of completedAppts) {
        const patientName = appt.patient.name || 'Patient'
        const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinicai.pk'}/feedback/${appt.id}`
        const message = (actionConfig.personalization?.message || '')
          .replace(/{patient_name}/g, patientName)
          .replace(/{doctor_name}/g, appt.doctor.name)
          .replace(/{feedback_url}/g, feedbackUrl)

        // Send WhatsApp message
        await sendWhatsAppMessage(appt.clinicId, decryptPhone(appt.patient.phone!), message)

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

    if (rule.triggerEvent === 'appointment.no_show') {
      const cutoff = new Date(now.getTime() - delayMinutes * 60 * 1000)
      const noShowAppts = await db.appointment.findMany({
        where: {
          clinicId: rule.clinicId,
          status: 'no_show',
          updatedAt: { lte: cutoff, gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) }, // last 48 hours
        },
        include: {
          patient: { select: { name: true, phone: true } },
          doctor: { select: { name: true } },
        },
        take: 20,
      })

      for (const appt of noShowAppts) {
        const message = (actionConfig.personalization?.message || '')
          .replace(/{patient_name}/g, appt.patient.name || 'Patient')
          .replace(/{doctor_name}/g, appt.doctor.name)
          .replace(/{appointment_date}/g, appt.start.toLocaleDateString('en-PK'))

        await sendWhatsAppMessage(appt.clinicId, decryptPhone(appt.patient.phone!), message)

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
  }

  return processed
}

/**
 * Send a WhatsApp message via the clinic's active channel.
 */
export async function sendWhatsAppMessage(clinicId: string, phone: string, message: string): Promise<boolean> {
  const { db } = await import('./db')
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, evolutionConnected: true, evolutionInstance: true, metaConnected: true, metaPhoneId: true },
  })
  if (!clinic || !phone) return false

  let sent = false

  try {
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
        sent = res.ok
      }
    }

    // Fallback to Meta API
    if (!sent && clinic.metaConnected && clinic.metaPhoneId) {
      const metaConn = await db.whatsAppConnection.findFirst({
        where: { clinicId: clinic.id, mode: 'meta', status: 'connected' },
        select: { metaTokenEnc: true },
      })
      const metaToken = metaConn?.metaTokenEnc ? decryptMetaToken(metaConn.metaTokenEnc) : ''
      if (metaToken) {
        const res = await sendMetaMessage(clinic.metaPhoneId, metaToken, phone, message)
        sent = res.ok
      }
    }
  } catch (err) {
    console.error(`[followup] Failed to send to ${phone}:`, err)
  }

  return sent
}
