/**
 * Campaign Automation Worker
 *
 * Processes campaign jobs from BullMQ:
 *  - send_campaign: sends campaign messages to targeted patients
 *  - sync_templates: syncs Meta Cloud API message templates
 *
 * Run as part of the main worker process.
 */
import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'
import type { ConnectionOptions } from 'bullmq'
import { db } from '../src/lib/db'
import { sendMetaMessage, decryptMetaToken } from '../src/lib/meta'
import { decryptPhone } from '../src/lib/phone-encryption'
import { resolveEvoCredentials } from '../src/lib/evolution'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 3000),
}) as unknown as ConnectionOptions

export const campaignQueue = new Queue('clinicai-campaigns', { connection })

// ============================================================================
// SEND CAMPAIGN
// ============================================================================

async function sendCampaign(job: { data: { campaignId: string } }) {
  const { campaignId } = job.data
  console.log(`[campaign] Starting campaign ${campaignId}`)

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { clinic: true },
  })

  if (!campaign) {
    console.warn(`[campaign] Campaign ${campaignId} not found`)
    return
  }

  if (campaign.status !== 'running') {
    console.log(`[campaign] Campaign ${campaignId} is ${campaign.status}, skipping`)
    return
  }

  // Find target patients based on campaign filter
  const filter = JSON.parse(campaign.filter || '{}')
  const where: Record<string, unknown> = { clinicId: campaign.clinicId }

  if (filter.lastVisitDays) {
    const cutoff = new Date(Date.now() - filter.lastVisitDays * 24 * 60 * 60 * 1000)
    where.appointments = { some: { start: { gte: cutoff } } }
  }
  if (filter.noShowCount !== undefined) {
    where.noShowCount = { gte: filter.noShowCount }
  }
  if (filter.optInMarketing) {
    where.optInMarketing = true
  }

  const patients = await db.patient.findMany({
    where: where as any,
    select: { id: true, name: true, phone: true },
    take: filter.limit || 500,
  })

  console.log(`[campaign] Sending to ${patients.length} patients`)

  let sent = 0
  let failed = 0

  for (const patient of patients) {
    try {
      const messageBody = campaign.templateBody || ''

      // Personalize message
      const personalizedBody = messageBody
        .replace(/\{name\}/g, patient.name || 'Patient')
        .replace(/\{clinic_name\}/g, campaign.clinic.name)

      // Send via WhatsApp
      let messageSent = false
      let error: string | null = null

      if (campaign.clinic.evolutionConnected) {
        const { baseUrl: evoUrl, apiKey: evoKey } = await resolveEvoCredentials()
        if (evoUrl && evoKey && campaign.clinic.evolutionInstance) {
          const res = await fetch(`${evoUrl}/message/sendText/${campaign.clinic.evolutionInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apiKey': evoKey },
            body: JSON.stringify({ number: patient.phone, text: personalizedBody }),
          })
          messageSent = res.ok
          if (!messageSent) error = `Evolution error: ${res.status}`
        }
      }

      if (!messageSent && campaign.clinic.metaConnected) {
        const metaConn = await db.whatsAppConnection.findFirst({
          where: { clinicId: campaign.clinicId, mode: 'meta', status: 'connected' },
          select: { metaTokenEnc: true },
        })
        const metaToken = metaConn?.metaTokenEnc ? decryptMetaToken(metaConn.metaTokenEnc) : ''
        const metaPhoneId = campaign.clinic.metaPhoneId
        if (metaToken && metaPhoneId) {
          const res = await sendMetaMessage(metaPhoneId, metaToken, decryptPhone(patient.phone), personalizedBody)
          messageSent = res.ok
          if (!messageSent) error = `Meta error: ${res.error || 'unknown'}`
        }
      }

      // Log the campaign message
      await db.campaignMessage.create({
        data: {
          campaignId,
          clinicId: campaign.clinicId,
          patientId: patient.id,
          phone: patient.phone,
          messageBody: personalizedBody,
          status: messageSent ? 'sent' : 'failed',
          error: error,
          sentAt: messageSent ? new Date() : null,
        },
      })

      if (messageSent) sent++
      else failed++
    } catch (err: any) {
      console.error(`[campaign] Failed to send to ${patient.phone}:`, err)
      failed++
    }
  }

  // Update campaign stats
  await db.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount: sent,
      failedCount: failed,
      status: sent > 0 ? 'completed' : 'cancelled',
    },
  })

  console.log(`[campaign] Campaign ${campaignId} done: ${sent} sent, ${failed} failed`)
}

export const campaignWorker = new Worker('clinicai-campaigns', sendCampaign, {
  connection,
  concurrency: 1,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
})

campaignWorker.on('completed', (job) => {
  console.log(`[campaign] Job ${job.id} completed`)
})

campaignWorker.on('failed', (job, err) => {
  console.error(`[campaign] Job ${job?.id} failed:`, err)
})
