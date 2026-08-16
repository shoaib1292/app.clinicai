/**
 * GET/POST /api/sms/gateways
 * Gateway registration + status — the mobile app registers here on startup.
 * Auth: GATEWAY_API_KEY header
 */
import { NextRequest } from 'next/server'
import { ok, err, handle } from '@/lib/api'
import { setGatewayOnline, setGatewayOffline, getOnlineGateway, getPendingCount } from '@/lib/sms-gateway'

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY

function checkAuth(req: NextRequest) {
  if (!GATEWAY_API_KEY) return false
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') && auth.slice(7) === GATEWAY_API_KEY
}

async function handler(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)

  if (req.method === 'GET') {
    const online = await getOnlineGateway()
    return ok({
      gateway: online ? { id: online, status: 'online' } : null,
      pendingCount: getPendingCount(),
    })
  }

  if (req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string }
    if (!body.id) return err('Gateway ID required', 400)

    if (body.action === 'online') {
      await setGatewayOnline(body.id)
      return ok({ registered: true, id: body.id })
    }
    if (body.action === 'offline') {
      await setGatewayOffline(body.id)
      return ok({ deregistered: true, id: body.id })
    }
    return err('Invalid action', 400)
  }

  return err('Method not allowed', 405)
}

export const GET = handle(handler)
export const POST = handle(handler)
