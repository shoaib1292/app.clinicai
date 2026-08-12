import type { MeetingProvider, CreateMeetingParams, MeetingResult } from '../types'
import { GoogleCalendarProvider } from '../calendar/google'

/**
 * Google Meet provider — delegates to Calendar API conferenceData.
 * No separate Meet API call needed. Meet links auto-generate via
 * the Calendar API's conferenceData.createRequest parameter.
 */
export class GoogleMeetProvider implements MeetingProvider {
  constructor(
    private calendarProvider: GoogleCalendarProvider,
    private clinicId: string,
    private connectionId: string,
  ) {}

  async createMeeting(params: CreateMeetingParams): Promise<MeetingResult> {
    // Create a calendar event with Meet conference data
    // This automatically generates a Google Meet link
    const result = await this.calendarProvider.createEvent({
      summary: `Video Consultation — ${params.doctorName} x ${params.patientName}`,
      start: params.startTime,
      end: new Date(params.startTime.getTime() + params.durationMinutes * 60 * 1000),
      timezone: 'Asia/Karachi',
      attendees: [],
      conferenceData: {
        createRequest: {
          requestId: `meet-${params.appointmentId}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      metadata: {
        appointmentId: params.appointmentId,
        type: 'telemedicine',
      },
    })

    return {
      providerMeetingId: result.providerEventId,
      joinUrl: result.meetLink || '',
      provider: 'google_meet',
    }
  }

  async endMeeting(_meetingId: string): Promise<void> {
    // Google Meet doesn't have a separate "end" API —
    // the room just expires when the event ends
  }

  async generateJoinToken(_meetingId: string, _identity: string, _name: string): Promise<string> {
    // Google Meet doesn't require tokens — the join URL is the token
    return ''
  }
}
