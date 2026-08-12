export interface ConferenceData {
  createRequest: {
    requestId: string
    conferenceSolutionKey: { type: 'hangoutsMeet' | 'teamsForBusiness' | 'livekit' }
  }
}

export interface CreateEventParams {
  summary: string
  description?: string
  start: Date
  end: Date
  attendees?: { email: string; displayName?: string }[]
  location?: string
  conferenceData?: ConferenceData
  timezone: string
  metadata?: Record<string, string>
}

export interface UpdateEventParams {
  summary?: string
  description?: string
  start?: Date
  end?: Date
  attendees?: { email: string; displayName?: string }[]
  conferenceData?: ConferenceData
  timezone?: string
}

export interface CalendarEventResult {
  providerEventId: string
  summary: string
  start: Date
  end: Date
  meetLink?: string
  status: string
}

export interface BusySlotQuery {
  start: Date
  end: Date
  timezone: string
}

export interface BusySlot {
  start: Date
  end: Date
}

export interface WatchResult {
  channelId: string
  resourceId: string
  expiry: Date
}

export interface CalendarProvider {
  createEvent(params: CreateEventParams): Promise<CalendarEventResult>
  updateEvent(providerEventId: string, params: UpdateEventParams): Promise<CalendarEventResult>
  deleteEvent(providerEventId: string): Promise<void>
  getBusySlots(params: BusySlotQuery): Promise<BusySlot[]>
  listEvents(start: Date, end: Date): Promise<CalendarEventResult[]>
  watchCalendar(): Promise<WatchResult>
  unwatchCalendar(channelId: string, resourceId: string): Promise<void>
}

// ──── MEETING PROVIDER ────

export interface CreateMeetingParams {
  appointmentId: string
  doctorName: string
  patientName: string
  startTime: Date
  durationMinutes: number
}

export interface MeetingResult {
  providerMeetingId: string
  joinUrl: string
  provider: 'google_meet' | 'livekit' | 'teams' | 'zoom' | 'daily'
}

export interface MeetingProvider {
  createMeeting(params: CreateMeetingParams): Promise<MeetingResult>
  endMeeting(meetingId: string): Promise<void>
  generateJoinToken(meetingId: string, identity: string, name: string): Promise<string>
}

// ──── EMAIL PROVIDER ────

export interface EmailAttachment {
  filename: string
  content: string | Buffer
  contentType?: string
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  attachments?: EmailAttachment[]
  replyTo?: string
}

export interface EmailSendResult {
  ok: boolean
  messageId?: string
  error?: string
}

export interface EmailProvider {
  sendEmail(params: SendEmailParams): Promise<EmailSendResult>
}

// ──── DOCUMENT PROVIDER ────

export interface UploadParams {
  name: string
  mimeType: string
  body: Buffer
  folderId?: string
  clinicId: string
  patientId?: string
  appointmentId?: string
}

export interface DocumentResult {
  providerFileId: string
  name: string
  mimeType: string
  webViewLink?: string
  folderId?: string
  size?: number
}

export interface ListFilesQuery {
  folderId?: string
  patientId?: string
  nameContains?: string
  limit?: number
}

export interface DocumentProvider {
  uploadFile(params: UploadParams): Promise<DocumentResult>
  deleteFile(fileId: string): Promise<void>
  getFile(fileId: string): Promise<DocumentResult | null>
  listFiles(query: ListFilesQuery): Promise<DocumentResult[]>
  createFolder(name: string, parentId?: string): Promise<DocumentResult>
}
