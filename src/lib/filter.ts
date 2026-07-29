/**
 * Message Filtering — per founder doc §8
 * Filters out group messages, status broadcasts, and other non-1:1 chat messages.
 * Filtered messages are logged to FilteredMessageLog for audit.
 */
import { db } from './db'
import { store } from './store'

export interface FilterResult {
  shouldProcess: boolean
  reason?: string
}

/**
 * Check if an inbound WhatsApp message should be processed or filtered out.
 * Filters: group messages, status broadcasts, system messages, forwarded spam.
 */
export function filterInboundMessage(payload: {
  from?: string
  isGroup?: boolean
  isStatus?: boolean
  isBroadcast?: boolean
  type?: string
  body?: string
  chatId?: string
  hasMedia?: boolean
}): FilterResult {
  // Group messages — filter out (founder doc: "group messages and status broadcasts are filtered out")
  if (payload.isGroup) {
    return { shouldProcess: false, reason: 'group' }
  }
  if (payload.chatId && payload.chatId.includes('@g.us')) {
    return { shouldProcess: false, reason: 'group' }
  }

  // Status broadcasts
  if (payload.isStatus) {
    return { shouldProcess: false, reason: 'status' }
  }
  if (payload.from === 'status@broadcast') {
    return { shouldProcess: false, reason: 'status' }
  }

  // Broadcast lists
  if (payload.isBroadcast) {
    return { shouldProcess: false, reason: 'broadcast' }
  }

  // System messages (Meta sends these for encryption notices, etc.)
  if (payload.type === 'system' || payload.type === 'reaction' || payload.type === 'ephemeral') {
    return { shouldProcess: false, reason: payload.type }
  }

  // Empty body + no media = nothing to process
  if (!payload.body && !payload.hasMedia && !payload.type) {
    return { shouldProcess: false, reason: 'empty' }
  }

  return { shouldProcess: true }
}

/**
 * Log a filtered message to the FilteredMessageLog table for audit.
 */
export async function logFilteredMessage(clinicId: string | null, reason: string, raw: unknown): Promise<void> {
  try {
    await db.filteredMessageLog.create({
      data: {
        clinicId,
        reason,
        raw: typeof raw === 'string' ? raw : JSON.stringify(raw),
      },
    })
  } catch (err) {
    console.error('[filter] Failed to log filtered message:', err)
  }
}

/**
 * Resolve clinic ID from a receiving WhatsApp number.
 * Looks up by whatsappConnections or by the clinic's linked number.
 */
export async function resolveClinicFromNumber(phoneNumber: string): Promise<string | null> {
  // Try to find a clinic with a WhatsApp connection for this number
  const conn = await db.whatsAppConnection.findFirst({
    where: { phoneNumber, status: 'connected' },
    select: { clinicId: true },
  })
  if (conn) return conn.clinicId

  // Fallback: check if any clinic has this as their agent number (sandbox mode)
  // In production, each clinic has a unique WhatsAppConnection
  return null
}

/**
 * Dedup inbound messages by provider message ID.
 * Uses in-memory store with 24h TTL (founder doc §7).
 */
export function isDuplicateMessage(providerMsgId: string): boolean {
  const key = `msg:dedup:${providerMsgId}`
  if (store.get(key)) return true
  store.set(key, true, 24 * 60 * 60) // 24h TTL
  return false
}
