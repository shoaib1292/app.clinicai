import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { getPatientFromCookie } from '@/lib/patient-cookie-session'
import { generateJoinToken, startLiveKitRoom, LIVEKIT_CLIENT_URL } from '@/lib/livekit'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'

async function getToken(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { roomName, identity, name } = body

  if (!roomName || !identity) return err('roomName and identity are required', 400)

  // Check staff session or patient cookie
  const session = await getSession()
  const patientPayload = await getPatientFromCookie()

  if (!session && !patientPayload) {
    return err('Authentication required', 401)
  }

  if (session) {
    // Staff or doctor — verify they have access to this clinic's room
    if (session.type === 'clinic_admin' || session.type === 'doctor' || session.type === 'receptionist') {
      const room = await db.dailyRoom.findUnique({
        where: { roomName },
        select: { clinicId: true, status: true },
      })
      if (!room) return err('Room not found', 404)
      if (room.clinicId && room.clinicId !== session.clinicId) {
        return err('Access denied', 403)
      }
    }
  }
  // patientPayload: for patient portal or join page, we allow token generation
  // since the room name itself is the access credential

  // Generate token
  const token = generateJoinToken({
    roomName,
    identity,
    name: name || identity,
    canPublish: true,
    canSubscribe: true,
  })

  // Activate room on first token request (non-critical)
  startLiveKitRoom(roomName).catch(() => {})

  return ok({
    token,
    url: LIVEKIT_CLIENT_URL,
    roomName,
  })
}

export const POST = handle(getToken)
