import type { CalendarProvider, MeetingProvider, EmailProvider, DocumentProvider } from './types'
import { GoogleCalendarProvider } from './calendar/google'
import { GoogleMeetProvider } from './meeting/google'
import { GoogleGmailProvider } from './email/google'
import { SmtpProvider } from './email/smtp'
import { GoogleDriveProvider } from './documents/google'
import { R2Provider } from './documents/r2'
import { db } from '@/lib/db'

interface ResolvedCalendar {
  provider: CalendarProvider
  type: 'google' | 'db_only'
}

interface ResolvedMeeting {
  provider: MeetingProvider
  type: 'google_meet' | 'livekit' | 'none'
  connectionId?: string
}

interface ResolvedEmail {
  provider: EmailProvider
  type: 'google' | 'smtp'
}

interface ResolvedDocument {
  provider: DocumentProvider
  type: 'google' | 'r2'
}

/**
 * Resolve the calendar provider for a clinic's doctor.
 * If the clinic has Google Calendar connected → GoogleCalendarProvider
 * Otherwise → null (use DB-only slot system as before)
 */
export async function resolveCalendarProvider(clinicId: string): Promise<ResolvedCalendar | null> {
  const connection = await db.googleConnection.findFirst({
    where: { clinicId, calendarEnabled: true, status: 'active' },
  })

  if (!connection) return null

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { timezone: true },
  })

  const provider = new GoogleCalendarProvider(
    connection.id,
    clinicId,
    clinic?.timezone || 'Asia/Karachi',
  )

  return { provider, type: 'google' }
}

/**
 * Resolve the meeting provider for telemedicine.
 * Priority: Google Meet (if calendar enabled) → LiveKit (always available)
 */
export async function resolveMeetingProvider(clinicId: string): Promise<ResolvedMeeting> {
  const connection = await db.googleConnection.findFirst({
    where: { clinicId, calendarEnabled: true, meetEnabled: true, status: 'active' },
  })

  if (connection) {
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    })
    const calProvider = new GoogleCalendarProvider(
      connection.id,
      clinicId,
      clinic?.timezone || 'Asia/Karachi',
    )
    return {
      provider: new GoogleMeetProvider(calProvider, clinicId, connection.id),
      type: 'google_meet',
      connectionId: connection.id,
    }
  }

  // Fall back to LiveKit (existing implementation)
  const { createLiveKitRoom, generateJoinToken: lkToken } = await import('@/lib/livekit')
  return {
    provider: {
      async createMeeting(params) {
        const result = await createLiveKitRoom({
          appointmentId: params.appointmentId,
          clinicId,
        })
        if (!result.ok || !result.roomName) throw new Error('LIVEKIT_ROOM_FAILED')
        return {
          providerMeetingId: result.roomName,
          joinUrl: result.roomUrl || `${process.env.LIVEKIT_URL?.replace('ws', 'http') || 'http://localhost:7880'}/rooms/${result.roomName}/join`,
          provider: 'livekit' as const,
        }
      },
      async endMeeting(meetingId: string) {
        const { endLiveKitRoom } = await import('@/lib/livekit')
        await endLiveKitRoom(meetingId)
      },
      async generateJoinToken(meetingId: string, identity: string, name: string) {
        return lkToken({ roomName: meetingId, identity, name })
      },
    },
    type: 'livekit',
  }
}

/**
 * Resolve the email provider for a clinic.
 * Priority: Google Gmail (if connected and gmailEnabled) → SMTP/Brevo (always available)
 */
export async function resolveEmailProvider(clinicId?: string): Promise<ResolvedEmail> {
  if (clinicId) {
    const connection = await db.googleConnection.findFirst({
      where: { clinicId, gmailEnabled: true, status: 'active' },
    })

    if (connection) {
      return {
        provider: new GoogleGmailProvider(connection.id, clinicId),
        type: 'google',
      }
    }
  }

  // Fall back to existing SMTP/Brevo provider
  return { provider: new SmtpProvider(), type: 'smtp' }
}

/**
 * Resolve the document storage provider for a clinic.
 * Priority: Google Drive (if connected and driveEnabled) → Cloudflare R2 (always available)
 */
export async function resolveDocumentProvider(clinicId: string): Promise<ResolvedDocument> {
  const connection = await db.googleConnection.findFirst({
    where: { clinicId, driveEnabled: true, status: 'active' },
  })

  if (connection) {
    return {
      provider: new GoogleDriveProvider(connection.id, clinicId),
      type: 'google',
    }
  }

  return { provider: new R2Provider(), type: 'r2' }
}
