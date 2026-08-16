/**
 * POST /api/sms/status
 * The mobile gateway app calls this to report SMS delivery status.
 * Auth: GATEWAY_API_KEY header
 */
import { NextRequest } from 'next/server'
import { ok, err, handle } from '@/lib/api'
import { markSmsSent, markSmsFailed } from '@/lib/sms-gateway'

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY

async function status(req: NextRequest) {
  if (!GATEWAY_API_KEY) return err('Gateway not configured', 503)

  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== GATEWAY_API_KEY) {
    return err('Unauthorized', 401)
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string; error?: string }
  if (!body.id) return err('Message ID required', 400)

  if (body.status === 'sent') {
    await markSmsSent(body.id)
  } else if (body.status === 'failed') {
    await markSmsFailed(body.id, body.error || 'Unknown error')
  } else {
    return err('Invalid status', 400)
  }

  return ok({ updated: true })
}

export const POST = handle(status)
