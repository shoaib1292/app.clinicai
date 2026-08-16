/**
 * POST /api/sms/send
 * Internal endpoint — sends an SMS via the connected mobile gateway.
 * Auth: GATEWAY_API_KEY header
 */
import { NextRequest } from 'next/server'
import { ok, err, handle } from '@/lib/api'
import { queueSms } from '@/lib/sms-gateway'

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY

async function send(req: NextRequest) {
  if (!GATEWAY_API_KEY) return err('Gateway not configured', 503)

  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== GATEWAY_API_KEY) {
    return err('Unauthorized', 401)
  }

  const body = (await req.json().catch(() => ({}))) as { to?: string; text?: string }
  const to = (body.to || '').trim()
  const text = (body.text || '').trim()

  if (!to) return err('Phone number required', 400)
  if (!text) return err('Message body required', 400)

  const result = await queueSms(to, text)
  if (!result.ok) return err(result.error || 'Failed to queue SMS', 503)

  return ok({ id: result.id, status: 'queued' })
}

export const POST = handle(send)
