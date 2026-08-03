import { AccessToken, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk'
import { db } from './db'
import { chargeTelemedicineCall } from './telemedicine-billing'

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880'
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey'
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret'

const roomClient = new RoomServiceClient(LIVEKIT_URL.replace(/^ws/, 'http'), LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

export const LIVEKIT_CLIENT_URL = LIVEKIT_URL

export function generateJoinToken(options: {
  roomName: string
  identity: string
  name: string
  canPublish?: boolean
  canSubscribe?: boolean
  ttlSeconds?: number
}): string {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: options.identity,
    name: options.name,
    ttl: options.ttlSeconds ?? 3600,
  })
  at.addGrant({
    room: options.roomName,
    roomJoin: true,
    canPublish: options.canPublish ?? true,
    canSubscribe: options.canSubscribe ?? true,
  })
  return at.toJwt()
}

export async function createLiveKitRoom(options?: {
  appointmentId?: string
  clinicId?: string
  maxParticipants?: number
}): Promise<{ ok: boolean; roomName?: string; roomUrl?: string; roomId?: string; error?: string }> {
  const roomName = `clinicai-${crypto.randomUUID()}`
  try {
    await roomClient.createRoom({
      name: roomName,
      emptyTimeout: 120,
      maxParticipants: options?.maxParticipants ?? 2,
      metadata: JSON.stringify({
        appointmentId: options?.appointmentId ?? null,
        clinicId: options?.clinicId ?? null,
      }),
    })

    const joinUrl = `${process.env.PUBLIC_BASE_URL || 'https://clinicai.pk'}/join/${roomName}`

    const room = await db.dailyRoom.create({
      data: {
        roomName,
        roomUrl: joinUrl,
        appointmentId: options?.appointmentId ?? null,
        clinicId: options?.clinicId ?? null,
        status: 'created',
        metadata: JSON.stringify({
          appointmentId: options?.appointmentId ?? null,
          clinicId: options?.clinicId ?? null,
        }),
      },
    })

    return { ok: true, roomName, roomUrl: joinUrl, roomId: room.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create LiveKit room' }
  }
}

export async function listActiveRooms() {
  try {
    const rooms = await roomClient.listRooms()
    return rooms.map(r => ({ name: r.name, numParticipants: r.numParticipants, creationTime: r.creationTime }))
  } catch {
    return []
  }
}

export async function startLiveKitRoom(roomName: string) {
  const room = await db.dailyRoom.findUnique({ where: { roomName } })
  if (!room) return null
  if (room.status === 'active') return room

  const updated = await db.dailyRoom.update({
    where: { roomName },
    data: { status: 'active', startedAt: new Date() },
  })

  if (updated.appointmentId) {
    const appt = await db.appointment.findUnique({ where: { id: updated.appointmentId }, select: { status: true } })
    if (appt && appt.status !== 'in_call' && appt.status !== 'completed') {
      await db.appointment.update({
        where: { id: updated.appointmentId },
        data: { status: 'in_call' },
      })
    }
  }

  return updated
}

export async function endLiveKitRoom(roomName: string) {
  const room = await db.dailyRoom.findUnique({ where: { roomName } })
  if (!room) return null

  const now = new Date()
  const duration = room.startedAt
    ? Math.ceil((now.getTime() - room.startedAt.getTime()) / 60000)
    : 0

  const updated = await db.dailyRoom.update({
    where: { roomName },
    data: {
      status: 'ended',
      endedAt: now,
      durationMinutes: duration,
    },
  })

  if (updated.appointmentId) {
    const appt = await db.appointment.findUnique({ where: { id: updated.appointmentId }, select: { clinicId: true, status: true } })
    if (appt && appt.status === 'in_call') {
      await db.appointment.update({
        where: { id: updated.appointmentId },
        data: { status: 'completed' },
      })
    }
  }

  // Trigger billing if we have a clinic
  if (updated.clinicId && duration > 0) {
    try {
      await chargeTelemedicineCall({
        roomName,
        clinicId: updated.clinicId,
        appointmentId: updated.appointmentId ?? undefined,
        doctorId: undefined,
        patientId: undefined,
        startedAt: room.startedAt ?? undefined,
        endedAt: now.toISOString(),
      })
    } catch (e) {
      console.error('[livekit] billing failed:', e)
    }
  }

  return updated
}

export async function deleteLiveKitRoom(roomName: string) {
  const room = await db.dailyRoom.findUnique({ where: { roomName } })
  if (!room) return { ok: false, error: 'Room not found' }

  try {
    await roomClient.deleteRoom(roomName)
  } catch {
    // Room may already be deleted on LiveKit server
  }

  await db.dailyRoom.update({
    where: { roomName },
    data: { status: 'ended', endedAt: room.endedAt ?? new Date() },
  })

  return { ok: true }
}

export async function verifyLiveKitWebhook(body: string, authorizationHeader: string) {
  return webhookReceiver.receive(body, authorizationHeader, true)
}

export function formatLiveKitRoomUrl(roomName: string) {
  return `${process.env.PUBLIC_BASE_URL || 'https://clinicai.pk'}/join/${roomName}`
}
