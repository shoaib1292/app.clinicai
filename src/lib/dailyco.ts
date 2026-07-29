import { db } from './db'
import { decrypt } from './auth'

const DAILY_API_BASE = 'https://api.daily.co/v1'
const DAILY_DOMAIN = process.env.DAILYCO_DOMAIN || 'clinicai.daily.co'

interface DailyKeyRow {
  id: string
  alias: string
  encryptedKey: string
  priority: number
  enabled: boolean
  minutesUsedToday: number
  dailyLimit: number
  resetDate: string | null
  lastError: string | null
  lastUsedAt: Date | null
}

/**
 * getActiveDailyKey — picks the lowest-priority enabled key that hasn't hit its daily limit.
 * Resets the counter if we crossed into a new day.
 * Returns decrypted key string + the DB row for tracking.
 */
export async function getActiveDailyKey(): Promise<{ apiKey: string; row: DailyKeyRow } | null> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD in PKT

  const keys = await db.dailyApiKey.findMany({
    where: { enabled: true, deletedAt: null },
    orderBy: { priority: 'asc' },
  })

  for (const row of keys) {
    // Reset counter if new day
    if (row.resetDate !== today) {
      await db.dailyApiKey.update({
        where: { id: row.id },
        data: { minutesUsedToday: 0, resetDate: today },
      })
      row.minutesUsedToday = 0
      row.resetDate = today
    }

    // Skip keys that hit their daily limit
    if (row.minutesUsedToday >= row.dailyLimit) continue

    // Try decrypting the key
    const apiKey = decrypt(row.encryptedKey)
    if (!apiKey) {
      await db.dailyApiKey.update({
        where: { id: row.id },
        data: { lastError: 'Decryption failed', lastUsedAt: new Date() },
      })
      continue
    }

    // Mark as used
    await db.dailyApiKey.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date(), lastError: null },
    })

    return { apiKey, row }
  }

  return null
}

/**
 * createDailyRoom — creates a room on Daily.co using the active key.
 * Sets expiry to 2 hours from now. Stores room in DB.
 */
export async function createDailyRoom(options?: {
  appointmentId?: string
  maxParticipants?: number
}) {
  const key = await getActiveDailyKey()
  if (!key) return { ok: false, error: 'No Daily.co API key configured. Add your key in Platform Admin → Daily.co Keys.' }

  const roomName = `clinicai-${crypto.randomUUID()}`
  const exp = Math.floor(Date.now() / 1000) + 7200 // 2 hours from now

  const res = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: roomName,
      privacy: 'public',
      properties: {
        start_audio_off: false,
        start_video_off: false,
        enable_chat: false,
        enable_screenshare: true,
        enable_knocking: false,
        max_participants: options?.maxParticipants ?? 2,
        exp,
        eject_at_room_exp: true,
        lang: 'en',
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    const errorMsg = res.status === 401
      ? 'Invalid Daily.co API key. Check the key in Platform Admin → Settings → Daily.co Keys.'
      : res.status === 403
        ? 'Daily.co API key lacks permission to create rooms. Check your API key permissions at dashboard.daily.co.'
        : `Daily.co API error: ${res.status} - ${body.slice(0, 200)}`
    await db.dailyApiKey.update({
      where: { id: key.row.id },
      data: { lastError: errorMsg, lastUsedAt: new Date() },
    })
    return { ok: false, error: errorMsg }
  }

  const data = await res.json() as { url: string; name: string }

  const room = await db.dailyRoom.create({
    data: {
      roomName,
      roomUrl: data.url,
      dailyKeyId: key.row.id,
      appointmentId: options?.appointmentId ?? null,
      status: 'created',
    },
  })

  return { ok: true, roomUrl: data.url, roomName, roomId: room.id }
}

/**
 * trackDailyMinutes — increments the minutes counter on a specific key.
 * Also checks if appointment is linked to the room and updates it.
 */
export async function trackDailyMinutes(keyId: string, minutes: number) {
  const key = await db.dailyApiKey.findUnique({ where: { id: keyId } })
  if (!key) return

  await db.dailyApiKey.update({
    where: { id: keyId },
    data: { minutesUsedToday: { increment: minutes } },
  })
}

/**
 * startDailyRoom — marks a room as active and sets startedAt.
 * Called when a participant actually joins (from the join page or doctor side).
 */
export async function startDailyRoom(roomName: string) {
  const room = await db.dailyRoom.findUnique({ where: { roomName } })
  if (!room) return null
  if (room.status === 'active') return room // already started

  return db.dailyRoom.update({
    where: { roomName },
    data: { status: 'active', startedAt: new Date() },
  })
}

/**
 * endDailyRoom — marks a room as ended and records duration.
 */
export async function endDailyRoom(roomName: string) {
  const room = await db.dailyRoom.findUnique({ where: { roomName } })
  if (!room) return null

  const now = new Date()
  const duration = room.startedAt
    ? Math.round((now.getTime() - room.startedAt.getTime()) / 60000)
    : 0

  const updated = await db.dailyRoom.update({
    where: { roomName },
    data: {
      status: 'ended',
      endedAt: now,
      durationMinutes: duration,
    },
  })

  // Track minutes against the key
  if (duration > 0) {
    await trackDailyMinutes(room.dailyKeyId, duration)
  }

  return updated
}

/**
 * deleteDailyRoom — deletes a room from Daily.co and marks it ended in DB.
 */
export async function deleteDailyRoom(roomName: string) {
  const room = await db.dailyRoom.findUnique({ where: { roomName } })
  if (!room) return { ok: false, error: 'Room not found in DB' }

  const key = await db.dailyApiKey.findUnique({ where: { id: room.dailyKeyId } })
  if (key) {
    const apiKey = decrypt(key.encryptedKey)
    if (apiKey) {
      await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    }
  }

  await db.dailyRoom.update({
    where: { roomName },
    data: { status: 'ended', endedAt: room.endedAt ?? new Date() },
  })

  return { ok: true }
}

export function formatDailyRoomUrl(roomName: string) {
  return `https://${DAILY_DOMAIN}/${roomName}`
}
