import { NextRequest } from 'next/server'
import { ok, err, handle } from '@/lib/api'

// Server-side broadcast to the realtime mini-service (port 3003).
// The realtime service exposes POST /broadcast { channel, message }.
async function broadcast(req: NextRequest) {
  const body = await req.json()
  const { channel, message } = body
  if (!channel) return err('channel required', 400)

  try {
    const realtimePort = process.env.REALTIME_PORT || '3003'
    // In production, this would be a Redis pub/sub publish.
    // In sandbox, we call the mini-service's HTTP endpoint via localhost.
    await fetch(`http://localhost:${realtimePort}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, message }),
    })
  } catch (e) {
    // Realtime service may be down — fail silently (the in-memory store already broadcast locally)
    console.warn('[realtime] broadcast to mini-service failed:', e)
  }

  return ok({ ok: true })
}

export const POST = handle(broadcast)
