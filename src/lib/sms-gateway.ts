/**
 * SMS Gateway — pushes OTP/SMS requests to the connected mobile gateway app
 * via in-memory pub/sub. The mobile app listens on the `sms:outgoing` channel.
 */

import { store } from './store'

const REALTIME_PORT = process.env.REALTIME_PORT || '3003'

export interface SmsPayload {
  id: string
  to: string
  body: string
  createdAt: number
}

let onlineGatewayId: string | null = null

const pendingStatus = new Map<string, SmsPayload>()

export function setGatewayOnline(id: string) {
  onlineGatewayId = id
  store.set('sms:gateway:online', id)
}

export function setGatewayOffline(id: string) {
  if (onlineGatewayId === id) {
    onlineGatewayId = null
    store.del('sms:gateway:online')
  }
}

export function getOnlineGateway(): string | null {
  if (onlineGatewayId) return onlineGatewayId
  const cached = store.get<string>('sms:gateway:online')
  if (cached) onlineGatewayId = cached
  return cached
}

async function broadcastToRealtime(channel: string, message: unknown) {
  try {
    await fetch(`http://localhost:${REALTIME_PORT}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, message }),
    })
  } catch {
    // Realtime service may be down — the in-memory store handles local subscribers
  }
}

export function queueSms(to: string, body: string): { ok: boolean; id: string; error?: string } {
  if (!getOnlineGateway()) {
    return { ok: false, id: '', error: 'No SMS gateway online' }
  }

  const id = `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const payload: SmsPayload = { id, to, body, createdAt: Date.now() }
  pendingStatus.set(id, payload)

  // Expire after 5 minutes
  store.set(`sms:pending:${id}`, payload, 300)

  // In-process publish (local subscribers) + cross-process broadcast to Socket.io
  store.publish('sms:outgoing', payload)
  broadcastToRealtime('sms:outgoing', payload)

  return { ok: true, id }
}

export function markSmsSent(id: string) {
  pendingStatus.delete(id)
  store.del(`sms:pending:${id}`)
  store.publish('sms:status', { id, status: 'sent' })
}

export function markSmsFailed(id: string, error: string) {
  pendingStatus.delete(id)
  store.del(`sms:pending:${id}`)
  store.publish('sms:status', { id, status: 'failed', error })
}

export function getPendingCount(): number {
  return pendingStatus.size
}
