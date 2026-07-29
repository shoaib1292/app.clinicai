import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

// POST /api/notifications/register-device
// Registers an Expo push token for a device
// Called by mobile app after login or when push token changes
async function registerDevice(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  const body = await req.json()
  const { expoPushToken, platform, deviceName } = body as {
    expoPushToken?: string
    platform?: string
    deviceName?: string
  }

  if (!expoPushToken) return err('expoPushToken is required', 400)

  // Upsert the device token
  const device = await db.deviceToken.upsert({
    where: {
      token_userId: {
        token: expoPushToken,
        userId: session.sub,
      },
    },
    create: {
      token: expoPushToken,
      userId: session.sub,
      userType: session.type,
      clinicId: session.clinicId || null,
      platform: platform || 'unknown',
      deviceName: deviceName || 'Unknown',
      lastUsedAt: new Date(),
    },
    update: {
      platform: platform || undefined,
      deviceName: deviceName || undefined,
      lastUsedAt: new Date(),
      active: true,
    },
  })

  return ok({ deviceId: device.id, registered: true })
}

// GET /api/notifications/register-device — list devices for current user
async function listDevices() {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  const devices = await db.deviceToken.findMany({
    where: { userId: session.sub, active: true },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      id: true,
      platform: true,
      deviceName: true,
      lastUsedAt: true,
      createdAt: true,
    },
  })

  return ok({ devices })
}

export const POST = handle(registerDevice)
export const GET = handle(listDevices)
