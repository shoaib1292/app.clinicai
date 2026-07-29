import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { createDailyRoom, endDailyRoom, startDailyRoom } from '@/lib/dailyco'
import { sendWhatsAppText, sendEmail } from '@/lib/notifications'
import { templateTelemedicineInvite } from '@/lib/telemedicine-notify'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { store } from '@/lib/store'

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

  const body = await req.json().catch(() => ({}))
  const result = await createDailyRoom({
    appointmentId: body.appointmentId,
    maxParticipants: body.maxParticipants ?? 2,
  })

  if (!result.ok) return err(result.error ?? 'Failed to create room', 500)

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

        // WhatsApp
        if (appt.patient?.phone) {
          const waMsg = `🏥 ClinicAI Telemedicine\n\nDr. ${doctorName} is ready for your video consultation.\n\nJoin now: ${joinUrl}\n\nYour appointment: ${apptDate} at ${apptTime}\n\n📹 Video ke liye link pe click karein. Kisi app download ki zaroorat nahi.`
          sendWhatsAppText(appt.clinicId, appt.patient.phone, waMsg).catch(() => {})
        }

        // Email
        if (appt.patient?.email) {
          const { subject, html } = templateTelemedicineInvite({ patientName, doctorName, appointmentDate: apptDate, appointmentTime: apptTime, joinUrl })
          sendEmail(appt.patient.email, subject, html, undefined, { category: 'telemedicine', clinicId: appt.clinicId }).catch(() => {})
        }

        // Realtime broadcast
        store.publish(`clinic:${appt.clinicId}:video`, { type: 'room_created', appointmentId: body.appointmentId, roomName: result.roomName, doctorName }).catch(() => {})
      }
    } catch (e) {
      console.error('[dailyco] notification dispatch failed:', e)
    }
  }

  return ok({
    roomUrl: result.roomUrl,
    roomName: result.roomName,
    roomId: result.roomId,
    patientJoinUrl: joinUrl,
    doctorJoinUrl: `${JOIN_BASE}/join/${result.roomName}`,
  })
}

async function end(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)

  const body = await req.json()
  const roomName = body.roomName
  if (!roomName) return err('roomName is required', 400)

  const result = await endDailyRoom(roomName)
  if (!result) return err('Room not found', 404)

  // Mark the linked appointment as completed
  if (result.appointmentId) {
    const appt = await db.appointment.findUnique({ where: { id: result.appointmentId }, select: { clinicId: true, status: true } })
    if (appt) {
      if (appt.status === 'booked' || appt.status === 'confirmed' || appt.status === 'held') {
        await db.appointment.update({ where: { id: result.appointmentId }, data: { status: 'completed' } })
      }
      store.publish(`clinic:${appt.clinicId}:video`, { type: 'call_ended', appointmentId: result.appointmentId, roomName, durationMinutes: result.durationMinutes }).catch(() => {})
    }
  }

  return ok({ roomName: result.roomName, status: result.status, durationMinutes: result.durationMinutes })
}

async function activate(req: NextRequest) {
  const body = await req.json()
  const roomName = body.roomName
  if (!roomName) return err('roomName is required', 400)

  const result = await startDailyRoom(roomName)
  if (!result) return err('Room not found', 404)

  // Broadcast that someone joined
  if (result.appointmentId) {
    const appt = await db.appointment.findUnique({ where: { id: result.appointmentId }, select: { clinicId: true } })
    if (appt) {
      store.publish(`clinic:${appt.clinicId}:video`, { type: 'call_active', appointmentId: result.appointmentId, roomName }).catch(() => {})
    }
  }

  return ok({ roomName: result.roomName, status: result.status })
}

export const GET = handle(getRoom)
export const POST = handle(create)
export const PATCH = handle(end)
export const PUT = handle(activate)
