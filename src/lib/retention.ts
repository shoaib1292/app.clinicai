/**
 * Conversation & Data Retention Policy (Founder Doc §35)
 * - 90 days hot (active in DB)
 * - Archive after 90 days
 * - Purge after 365 days (configurable per clinic)
 * - Payment screenshots: 24 months retention
 */

import { db } from './db'

const DEFAULT_HOT_DAYS = 90
const DEFAULT_ARCHIVE_DAYS = 365
const DEFAULT_SCREENSHOT_RETENTION_DAYS = 730 // 24 months

/**
 * Archive conversations older than hot retention period.
 * Sets conversation.status = 'archived' and removes from active queries.
 */
export async function archiveOldConversations(days: number = DEFAULT_HOT_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await db.conversation.updateMany({
    where: {
      status: 'active',
      updatedAt: { lt: cutoff },
    },
    data: { status: 'archived' },
  })

  return result.count
}

/**
 * Permanently purge archived conversations and their messages after retention period.
 * This is GDPR-compliant data minimization.
 */
export async function purgeOldConversations(days: number = DEFAULT_ARCHIVE_DAYS): Promise<{
  conversations: number
  messages: number
  total: number
}> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Find conversations to purge
  const oldConversations = await db.conversation.findMany({
    where: {
      status: 'archived',
      updatedAt: { lt: cutoff },
    },
    select: { id: true },
  })

  if (oldConversations.length === 0) {
    return { conversations: 0, messages: 0, total: 0 }
  }

  const ids = oldConversations.map((c) => c.id)

  // Delete messages first (FK constraint)
  const msgResult = await db.message.deleteMany({
    where: { conversationId: { in: ids } },
  })

  // Delete conversations
  const convResult = await db.conversation.deleteMany({
    where: { id: { in: ids } },
  })

  return {
    conversations: convResult.count,
    messages: msgResult.count,
    total: convResult.count + msgResult.count,
  }
}

/**
 * Purge old payment screenshots after retention period.
 */
export async function purgeOldPaymentScreenshots(days: number = DEFAULT_SCREENSHOT_RETENTION_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Soft-delete old payment proofs
  const result = await db.paymentProof.updateMany({
    where: { createdAt: { lt: cutoff } },
    data: { notes: '[PURGED] Screenshot removed per retention policy' },
  })

  return result.count
}

/**
 * Anonymize a patient's data (Right to be Forgotten — Founder Doc §35).
 * Keeps appointment records for clinic analytics but removes PII.
 */
export async function anonymizePatient(patientId: string): Promise<void> {
  await db.patient.update({
    where: { id: patientId },
    data: {
      name: '[Anonymized]',
      phone: '[removed]',
      phoneHash: `anon_${patientId}`,
      phoneLast4: '0000',
      metadata: '{}',
      optInMarketing: false,
      preferredLanguage: 'urdu',
      preferredModality: 'text',
    },
  })

  // Soft-delete family members
  await db.patientFamilyMember.updateMany({
    where: { patientId },
    data: { deletedAt: new Date() },
  })

  // Anonymize message bodies in conversations
  const conversations = await db.conversation.findMany({
    where: { patientId },
    select: { id: true },
  })
  for (const conv of conversations) {
    await db.message.updateMany({
      where: { conversationId: conv.id },
      data: { body: '[anonymized]', transcript: null },
    })
  }
}
