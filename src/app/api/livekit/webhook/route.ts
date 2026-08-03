import { NextRequest } from 'next/server'
import { verifyLiveKitWebhook, startLiveKitRoom, endLiveKitRoom } from '@/lib/livekit'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const body = await req.text()

  let event
  try {
    event = await verifyLiveKitWebhook(body, authHeader)
  } catch {
    return new Response('invalid signature', { status: 401 })
  }

  const { event: eventType, room } = event

  try {
    switch (eventType) {
      case 'room_started': {
        await startLiveKitRoom(room?.name || '')
        break
      }
      case 'participant_joined': {
        // Ensure room is active when someone joins
        if (room?.name) {
          await startLiveKitRoom(room.name)
        }
        break
      }
      case 'room_finished': {
        if (room?.name) {
          await endLiveKitRoom(room.name)
        }
        break
      }
    }
  } catch (e) {
    console.error('[livekit-webhook]', eventType, e)
  }

  // Always return 200 — LiveKit retries on non-200
  return new Response('ok', { status: 200 })
}
