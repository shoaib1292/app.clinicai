import { google, calendar_v3 } from 'googleapis'
import type {
  CalendarProvider, CreateEventParams, UpdateEventParams,
  CalendarEventResult, BusySlotQuery, BusySlot, WatchResult,
} from '../types'
import { getOAuth2Client } from '@/lib/google-token-manager'
import { db } from '@/lib/db'
import crypto from 'crypto'

export class GoogleCalendarProvider implements CalendarProvider {
  constructor(private connectionId: string, private clinicId: string, private timezone: string) {}

  private async getCalendar() {
    const auth = await getOAuth2Client(this.connectionId)
    if (!auth) throw new Error('GOOGLE_AUTH_FAILED')
    return google.calendar({ version: 'v3', auth })
  }

  async createEvent(params: CreateEventParams): Promise<CalendarEventResult> {
    const calendar = await this.getCalendar()
    const requestId = crypto.randomUUID()

    const event: calendar_v3.Schema$Event = {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.start.toISOString(), timeZone: params.timezone },
      end: { dateTime: params.end.toISOString(), timeZone: params.timezone },
      attendees: params.attendees?.map(a => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: 'needsAction',
      })),
      location: params.location,
      extendedProperties: {
        private: params.metadata || {},
      },
    }

    if (params.conferenceData) {
      event.conferenceData = {
        createRequest: {
          requestId,
          conferenceSolutionKey: params.conferenceData.createRequest.conferenceSolutionKey,
        },
      }
    }

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: params.conferenceData ? 1 : 0,
    })

    const created = res.data
    if (!created.id) throw new Error('Google returned no event ID')

    // Store in local DB for tracking
    await db.googleCalendarEvent.create({
      data: {
        id: created.id,
        connectionId: this.connectionId,
        clinicId: this.clinicId,
        googleCalendarId: 'primary',
        etag: created.etag || undefined,
        status: created.status || 'confirmed',
        appointmentId: params.metadata?.appointmentId,
      },
    })

    // Audit
    await db.googleAuditLog.create({
      data: {
        clinicId: this.clinicId,
        connectionId: this.connectionId,
        action: 'event_created',
        metadata: JSON.stringify({ providerEventId: created.id }),
      },
    })

    return {
      providerEventId: created.id,
      summary: created.summary || '',
      start: new Date(created.start?.dateTime || created.start?.date || ''),
      end: new Date(created.end?.dateTime || created.end?.date || ''),
      meetLink: created.hangoutLink || undefined,
      status: created.status || 'confirmed',
    }
  }

  async updateEvent(providerEventId: string, params: UpdateEventParams): Promise<CalendarEventResult> {
    const calendar = await this.getCalendar()

    const event: calendar_v3.Schema$Event = {}
    if (params.summary) event.summary = params.summary
    if (params.description) event.description = params.description
    if (params.start) event.start = { dateTime: params.start.toISOString(), timeZone: params.timezone }
    if (params.end) event.end = { dateTime: params.end.toISOString(), timeZone: params.timezone }
    if (params.attendees) {
      event.attendees = params.attendees.map(a => ({
        email: a.email,
        displayName: a.displayName,
      }))
    }

    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId: providerEventId,
      requestBody: event,
    })

    const updated = res.data
    return {
      providerEventId: updated.id || providerEventId,
      summary: updated.summary || '',
      start: new Date(updated.start?.dateTime || updated.start?.date || ''),
      end: new Date(updated.end?.dateTime || updated.end?.date || ''),
      meetLink: updated.hangoutLink || undefined,
      status: updated.status || 'confirmed',
    }
  }

  async deleteEvent(providerEventId: string): Promise<void> {
    const calendar = await this.getCalendar()
    try {
      await calendar.events.delete({ calendarId: 'primary', eventId: providerEventId })
    } catch (e: unknown) {
      // 410 Gone = already deleted — non-fatal
      if ((e as { code?: number }).code !== 410) throw e
    }

    // Remove local tracking
    await db.googleCalendarEvent.deleteMany({
      where: { id: providerEventId, connectionId: this.connectionId },
    })

    await db.googleAuditLog.create({
      data: {
        clinicId: this.clinicId,
        connectionId: this.connectionId,
        action: 'event_deleted',
        metadata: JSON.stringify({ providerEventId }),
      },
    })
  }

  async getBusySlots(params: BusySlotQuery): Promise<BusySlot[]> {
    const calendar = await this.getCalendar()
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.start.toISOString(),
        timeMax: params.end.toISOString(),
        timeZone: params.timezone,
        items: [{ id: 'primary' }],
      },
    })

    const busy: BusySlot[] = []
    const busySlots = res.data.calendars?.primary?.busy || []
    for (const b of busySlots) {
      if (b.start && b.end) {
        busy.push({ start: new Date(b.start), end: new Date(b.end) })
      }
    }
    return busy
  }

  async listEvents(start: Date, end: Date): Promise<CalendarEventResult[]> {
    const calendar = await this.getCalendar()
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    // Check sync token for incremental sync
    const connection = await db.googleConnection.findUnique({ where: { id: this.connectionId } })
    if (res.data.nextSyncToken && connection) {
      await db.googleConnection.update({
        where: { id: this.connectionId },
        data: { calendarSyncToken: res.data.nextSyncToken, lastCalendarSyncAt: new Date() },
      })
    }

    return (res.data.items || []).map(e => ({
      providerEventId: e.id || '',
      summary: e.summary || '',
      start: new Date(e.start?.dateTime || e.start?.date || ''),
      end: new Date(e.end?.dateTime || e.end?.date || ''),
      meetLink: e.hangoutLink || undefined,
      status: e.status || 'confirmed',
    }))
  }

  async watchCalendar(): Promise<WatchResult> {
    const calendar = await this.getCalendar()
    const channelId = crypto.randomUUID()
    const webhookUrl = `${process.env.WHATSAPP_WEBHOOK_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:8000'}/api/webhooks/google/calendar`

    const channelToken = crypto.randomBytes(32).toString('hex')

    const res = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: channelToken,
        params: { ttl: '604800' }, // 7 days
      },
    })

    const resourceId = res.data.resourceId
    const expiry = new Date(Date.now() + Number(res.data.expiration || '604800000'))

    if (!resourceId) throw new Error('Google returned no resourceId')

    await db.googleConnection.update({
      where: { id: this.connectionId },
      data: {
        calendarResourceId: resourceId,
        calendarChannelExpiry: expiry,
      },
    })

    return { channelId, resourceId, expiry }
  }

  async unwatchCalendar(channelId: string, resourceId: string): Promise<void> {
    const calendar = await this.getCalendar()
    try {
      await calendar.channels.stop({
        requestBody: { id: channelId, resourceId },
      })
    } catch {
      // Channel may already be expired/stopped
    }

    await db.googleConnection.update({
      where: { id: this.connectionId },
      data: { calendarResourceId: null, calendarChannelExpiry: null },
    })
  }
}
