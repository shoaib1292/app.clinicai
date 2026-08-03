import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { createLiveKitRoom, endLiveKitRoom } from '@/lib/livekit'
import { sendWhatsAppText, sendEmail } from '@/lib/notifications'
import { templateTelemedicineInvite } from '@/lib/telemedicine-notify'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'

const JOIN_BASE = process.env.PUBLIC_BASE_URL || 'https://clinicai.pk'

async function getRoom(req: NextRequest) {
  const url = new URL(req.url)
  const roomName = url.searchParams.get('roomName')
  if (!roomName) return err('roomName required', 400)

  const room = await db.dailyRoom.findUnique({
    where: { roomName },
    select: { id: true, roomName: true, roomUrl: true, status: true, appointmentId: true, createdAt: true, endedAt: true, durationMinutes: true },
  })
  if (!room) return err('Room not found', 404)
  return ok(room)
}

async function create(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  let clinicId: string | undefined
  if (session.type === 'clinic_admin' || session.type === 'doctor' || session.type === 'receptionist') {
    clinicId = session.clinicId
  }

  const body = await req.json().catch(() => ({}))
  const result = await createLiveKitRoom({
    appointmentId: body.appointmentId,
    clinicId: body.clinicId || clinicId,
    maxParticipants: body.maxParticipants ?? 2,
  })

  if (!result.ok) return err(result.error ?? 'Failed to create room', 500)
  if (!result.roomName) return err('Room creation failed', 500)

  const joinUrl = `${JOIN_BASE}/join/${result.roomName}`

  // Fire-and-forget: notify patient via WhatsApp + Email
  if (body.appointmentId && body.notifyPatient !== false) {
    try {
      const appt = await db.appointment.findUnique({
        where: { id: body.appointmentId },
        select: {
          clinicId: true,
          start: true,
          end: true,
          patient: { select: { id: true, name: true, phone: true, email: true } },
          doctor: { select: { name: true } },
        },
      })
      if (appt) {
        const apptDate = appt.start.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        const apptTime = appt.start.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
        const doctorName = appt.doctor?.name || 'Doctor'
        const patientName = appt.patient?.name || 'Patient'

        if (appt.patient?.phone) {
          const waMsg = `🏥 ClinicAI Telemedicine\n\nDr. ${doctorName} is ready for your video consultation.\n\nJoin now: ${joinUrl}\n\nYour appointment: ${apptDate} at ${apptTime}\n\n📹 Video ke liye link pe click karein. Kisi app download ki zaroorat nahi.`
          sendWhatsAppText(appt.clinicId, appt.patient.phone, waMsg).catch(() => {})
        }

        if (appt.patient?.email) {
          const { subject, html } = templateTelemedicineInvite({ patientName, doctorName, appointmentDate: apptDate, appointmentTime: apptTime, joinUrl })
          sendEmail(appt.patient.email, subject, html, undefined, { category: 'telemedicine', clinicId: appt.clinicId }).catch(() => {})
        }

        // Mark appointment as in_call
        const apptStatus = await db.appointment.findUnique({ where: { id: body.appointmentId }, select: { status: true } })
        if (apptStatus && apptStatus.status !== 'in_call' && apptStatus.status !== 'completed') {
          await db.appointment.update({ where: { id: body.appointmentId }, data: { status: 'in_call' } }).catch(() => {})
        }
      }
    } catch (e) {
      console.error('[livekit] notification dispatch failed:', e)
    }
  }

  return ok({
    roomName: result.roomName,
    roomId: result.roomId,
    patientJoinUrl: joinUrl,
    doctorJoinUrl: joinUrl,
  })
}

async function end(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  const body = await req.json()
  const roomName = body.roomName
  if (!roomName) return err('roomName is required', 400)

  const result = await endLiveKitRoom(roomName)
  if (!result) return err('Room not found', 404)

  return ok({ roomName: result.roomName, status: result.status, durationMinutes: result.durationMinutes })
}

export const GET = handle(getRoom)
export const POST = handle(create)
export const PATCH = handle(end)
