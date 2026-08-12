# Google Ecosystem Integration — Production Design for ClinicAI

## Context Summary

**What exists today:**
- Custom JWT auth (`src/lib/auth.ts`) — no OAuth, no Google sign-in. `next-auth` v4 is installed but unused.
- 48 Prisma models. No OAuth token storage, no calendar/meeting provider tables.
- LiveKit handles telemedicine video. No Google Meet.
- Email via SMTP/Brevo (nodemailer). No Gmail API.
- Appointments flow through DB-backed `Slot` model. No external calendar sync.
- No provider abstraction layer — LiveKit is hardcoded as the sole video provider.

**Taste constraints:**
- Single shared PostgreSQL + Redis for all apps (dashboard, landing, worker, realtime, mobile)
- Every query tenant-scoped with `clinicId`
- JSON fields OK for V1 with documented migration path to normalized tables
- Code-based registries over DB tables for static/config data
- Provider abstraction is explicitly asked for in the requirements

---

## 1. Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                     ClinicAI Dashboard                     │
│                                                           │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌─────────────┐ │
│  │Google   │  │Calendar  │  │ Gmail  │  │ Google      │ │
│  │OAuth    │  │Provider  │  │Provider│  │ Drive       │ │
│  │(next-   │  │          │  │        │  │ Provider    │ │
│  │ auth)   │  │          │  │        │  │             │ │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └──────┬──────┘ │
│       │            │            │               │         │
│  ┌────┴────────────┴────────────┴───────────────┴──────┐ │
│  │              Provider Abstraction Layer              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │  │Calendar  │  │ Meeting  │  │ Email/Document   │  │ │
│  │  │Interface │  │Interface │  │ Interface         │  │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              OAuth Token Manager                      │ │
│  │  AES-256-GCM encrypted storage | Auto-refresh         │ │
│  │  Incremental scopes | Multi-account per clinic        │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

**Core principle:** One Google account connection unlocks all features. Scopes are requested incrementally — never all at once.

---

## 2. OAuth Authentication Flow

### 2.1 Why next-auth (finally activate it)

`next-auth` v4 is already in `package.json`. It provides:
- Google OAuth provider out of the box
- `Account` model for linking multiple providers to one user
- `Session` management with JWT or database strategy
- Built-in CSRF protection, callback URLs, and token refresh

**Decision:** Activate next-auth with database strategy. Keep the existing custom JWT system for email/password users. Both auth systems coexist — next-auth handles Google OAuth; the custom system handles email+password+2FA.

### 2.2 Database Models (new tables)

```prisma
// ──── NEXT-AUTH STANDARD TABLES (activate existing next-auth) ────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth"
  provider          String  // "google"
  providerAccountId String
  refresh_token     String? // encrypted, AES-256-GCM
  access_token      String? // encrypted, AES-256-GCM
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ──── UNIFIED USER MODEL (bridges all auth methods) ────

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique  // optional — not all users have email (patients use phone)
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]

  // Polymorphic link to the actual user record
  // userId on each existing table (ClinicAdmin.id, Doctor.id, etc.)
  // maps to this unified User.id when they sign in with Google

  googleConnections GoogleConnection[]
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  @@index([email])
}

// ──── GOOGLE-SPECIFIC MODELS ────

model GoogleConnection {
  id        String   @id @default(cuid())
  userId    String
  clinicId  String

  // OAuth metadata (redundant with Account, but clinic-scoped)
  googleEmail    String
  scopeSnapshot  String   // scopes granted at last auth

  // Feature toggles (what this connection enables)
  calendarEnabled  Boolean @default(false)
  meetEnabled      Boolean @default(false)
  gmailEnabled     Boolean @default(false)
  driveEnabled     Boolean @default(false)
  contactsEnabled  Boolean @default(false)
  businessEnabled  Boolean @default(false)

  // Calendar sync state
  calendarSyncToken     String?  // Google Calendar sync token (incremental)
  calendarResourceId    String?  // Google Calendar resource watch channel
  calendarChannelExpiry DateTime?
  lastCalendarSyncAt    DateTime?

  // Drive folder structure
  driveRootFolderId   String?
  drivePatientsFolderId String?

  // Status
  status  String  @default("active")  // active | expired | revoked | error
  lastError   String?
  lastErrorAt DateTime?

  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  clinic  Clinic  @relation(fields: [clinicId], references: [id], onDelete: Cascade)

  tokens          GoogleToken[]
  calendarEvents  GoogleCalendarEvent[]
  driveFiles      GoogleDriveFile[]
  businessProfile GoogleBusinessProfile?

  @@unique([userId, clinicId])   // one Google account → one connection per clinic
  @@index([clinicId])
  @@index([googleEmail])
}

model GoogleToken {
  id            String   @id @default(cuid())
  connectionId  String
  accessToken   String   // AES-256-GCM encrypted
  refreshToken  String?  // AES-256-GCM encrypted (Google may not reissue)
  idToken       String?  // encrypted
  tokenType     String   @default("Bearer")
  scope         String
  expiresAt     DateTime
  issuedAt      DateTime @default(now())

  connection GoogleConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@index([connectionId])
  @@index([expiresAt])
}

model GoogleCalendarEvent {
  id             String   @id  // Google event ID (globally unique)
  connectionId   String
  clinicId       String
  appointmentId  String?  // nullable — can be a manual Google Calendar block
  googleCalendarId String @default("primary")

  // Sync metadata
  etag       String?
  status     String   // confirmed | tentative | cancelled
  syncedAt   DateTime @default(now())

  // Local reference
  connection   GoogleConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  appointment  Appointment?     @relation(fields: [appointmentId], references: [id], onDelete: SetNull)

  @@unique([connectionId, googleCalendarId, id])
  @@index([appointmentId])
  @@index([clinicId])
}

model GoogleDriveFile {
  id           String   @id  // Google Drive file ID
  connectionId String
  clinicId     String
  patientId    String?
  appointmentId String?

  name         String
  mimeType     String
  folderId     String?
  webViewLink  String?
  size         BigInt?

  // Sync metadata
  etag       String?
  syncedAt   DateTime @default(now())
  createdAt  DateTime @default(now())

  connection   GoogleConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  patient      Patient?         @relation(fields: [patientId], references: [id], onDelete: SetNull)
  appointment  Appointment?     @relation(fields: [appointmentId], references: [id], onDelete: SetNull)

  @@index([connectionId])
  @@index([patientId])
  @@index([clinicId])
}

model GoogleBusinessProfile {
  id           String   @id @default(cuid())
  connectionId String   @unique

  name         String?
  placeId      String?
  formattedAddress String?
  phoneNumber  String?
  websiteUrl   String?
  rating       Float?
  reviewCount  Int?
  openingHours Json?    // structured hours from Google My Business API

  syncedAt     DateTime @default(now())

  connection   GoogleConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
}

// ──── AUDIT LOG EXTENSION ────

model GoogleAuditLog {
  id           String   @id @default(cuid())
  clinicId     String
  connectionId String?
  action       String   // token_refreshed | scope_granted | scope_revoked | calendar_sync | event_created | event_updated | event_deleted | meet_created | email_sent | drive_upload | drive_delete | connection_revoked | error
  googleEmail  String?
  metadata     Json?
  error        String?
  createdAt    DateTime @default(now())

  clinic Clinic @relation(fields: [clinicId], references: [id], onDelete: Cascade)

  @@index([clinicId, createdAt])
  @@index([connectionId])
}
```

### 2.3 Incremental OAuth Scope Strategy

```
Phase 1 — Sign In (mandatory, first connect)
  Scopes: openid, profile, email
  Unlocks: Google Sign-In for all user types
  UX: "Continue with Google" button on login/signup

Phase 2 — Calendar (requested when clinic enables scheduling)
  Scopes: https://www.googleapis.com/auth/calendar.events
          https://www.googleapis.com/auth/calendar.readonly
  Unlocks: Auto-create events, read busy/free, prevent double-booking
  UX: Settings toggle "Connect Google Calendar" → incremental consent screen

Phase 3 — Meet (requested when telemedicine is enabled)
  Scopes: (none extra — Meet links come via Calendar API conferenceData)
  Unlocks: Auto-attach Google Meet to calendar events
  UX: Implicit — if Calendar is connected and telemedicine is on, Meet links auto-generate

Phase 4 — Gmail (requested when clinic enables email sending)
  Scopes: https://www.googleapis.com/auth/gmail.send
  Unlocks: Send emails from clinic's Gmail address
  UX: Settings toggle "Send emails via Gmail" → incremental consent screen

Phase 5 — Drive (requested when clinic enables document storage)
  Scopes: https://www.googleapis.com/auth/drive.file
  Unlocks: Auto-organize patient documents in Drive
  UX: Settings toggle "Store documents in Google Drive" → incremental consent screen

Phase 6 — Contacts (optional, patient opt-in)
  Scopes: https://www.googleapis.com/auth/contacts
  Unlocks: Sync patients/doctors to Google Contacts
  UX: Explicit per-user opt-in, not auto-requested

Phase 7 — Business Profile (optional, read-only)
  Scopes: https://www.googleapis.com/auth/business.manage
  Unlocks: Read clinic info, reviews, hours
  UX: Settings toggle "Connect Google Business Profile" → incremental consent
```

**Key rule:** Never request all scopes upfront. Each feature unlock triggers its own OAuth consent screen. This maximizes trust and approval rates.

### 2.4 User Identity Mapping

Existing user tables (`ClinicAdmin`, `Doctor`, `Receptionist`, `PlatformAdmin`, `PlatformStaff`) each have `email`. When a user signs in with Google:

1. Look up by `email` across the 5 user tables (same as existing login flow)
2. If found → link that existing record to the new `User.id` (store the mapping)
3. If not found → allow signup flow (create ClinicAdmin or PatientAppUser record)
4. The `User` model becomes the unified identity hub. Existing `passwordHash` auth continues to work — users can have both Google OAuth and password on the same account.

**Migration approach for existing users:** Add a nullable `userId` field to `ClinicAdmin`, `Doctor`, `Receptionist`, `PlatformAdmin`, `PlatformStaff`. When a user signs in with Google for the first time, create the `User` record and backfill the `userId`. Existing email+password users keep working as-is.

---

## 3. Provider Abstraction Layer

### 3.1 Calendar Provider

```ts
// src/lib/providers/calendar/types.ts

interface CalendarProvider {
  /** Create an event. Returns the provider's event ID. */
  createEvent(params: CreateEventParams): Promise<CalendarEventResult>;

  /** Update an existing event (reschedule, add Meet link, etc.) */
  updateEvent(providerEventId: string, params: UpdateEventParams): Promise<CalendarEventResult>;

  /** Delete/cancel an event */
  deleteEvent(providerEventId: string): Promise<void>;

  /** Get busy/free slots for a time range */
  getBusySlots(params: BusySlotQuery): Promise<BusySlot[]>;

  /** List events in a time range (for sync verification) */
  listEvents(params: ListEventsQuery): Promise<CalendarEventResult[]>;

  /** Start watching for changes (webhook/push notifications) */
  watchCalendar(params: WatchParams): Promise<WatchResult>;

  /** Stop watching */
  unwatchCalendar(channelId: string, resourceId: string): Promise<void>;
}

interface CreateEventParams {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: { email: string; displayName?: string }[];
  location?: string;
  conferenceData?: ConferenceData;  // Google Meet / Teams link
  timezone: string;
  metadata?: Record<string, string>;  // appointmentId, clinicId, etc.
}

interface ConferenceData {
  createRequest: {
    requestId: string;  // UUID to prevent duplicate Meet creation
    conferenceSolutionKey: { type: 'hangoutsMeet' | 'teamsForBusiness' };
  };
}

// ... (other types for BusySlotQuery, BusySlot, etc.)
```

### 3.2 Meeting Provider

```ts
// src/lib/providers/meeting/types.ts

interface MeetingProvider {
  /** Create a meeting room and return the join URL */
  createMeeting(params: CreateMeetingParams): Promise<MeetingResult>;

  /** End/delete a meeting */
  endMeeting(meetingId: string): Promise<void>;

  /** Generate a join token for an authenticated user */
  generateJoinToken(meetingId: string, user: MeetingParticipant): Promise<string>;

  /** Get meeting status */
  getMeeting(meetingId: string): Promise<MeetingResult>;
}

interface CreateMeetingParams {
  appointmentId: string;
  doctorName: string;
  patientName: string;
  startTime: Date;
  durationMinutes: number;
}

interface MeetingResult {
  providerMeetingId: string;
  joinUrl: string;
  provider: 'google_meet' | 'livekit' | 'teams' | 'zoom' | 'daily';
}
```

### 3.3 Email Provider

```ts
// src/lib/providers/email/types.ts

interface EmailProvider {
  /** Send an email. Returns the provider's message ID. */
  sendEmail(params: SendEmailParams): Promise<EmailSendResult>;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;          // defaults to clinic's connected email
  attachments?: EmailAttachment[];
  replyTo?: string;
}
```

### 3.4 Document Provider

```ts
// src/lib/providers/documents/types.ts

interface DocumentProvider {
  /** Upload a file to the provider's storage */
  uploadFile(params: UploadParams): Promise<DocumentResult>;

  /** Delete a file */
  deleteFile(fileId: string): Promise<void>;

  /** Get a file's metadata/download link */
  getFile(fileId: string): Promise<DocumentResult>;

  /** List files in a folder */
  listFiles(folderId: string, query?: ListFilesQuery): Promise<DocumentResult[]>;

  /** Create a folder */
  createFolder(name: string, parentId?: string): Promise<DocumentResult>;
}
```

### 3.5 Provider Registry (code-based, not DB)

```ts
// src/lib/providers/registry.ts

const calendarProviders: Record<string, CalendarProviderFactory> = {
  google: (connection: GoogleConnection) => new GoogleCalendarProvider(connection),
  outlook: (connection: OutlookConnection) => new OutlookCalendarProvider(connection),
  // future: apple, etc.
};

const meetingProviders: Record<string, MeetingProviderFactory> = {
  google_meet: (connection: GoogleConnection) => new GoogleMeetProvider(connection),
  livekit: () => new LiveKitProvider(),  // existing, no per-clinic connection needed
  teams: (connection: OutlookConnection) => new TeamsProvider(connection),
  zoom: (connection: ZoomConnection) => new ZoomProvider(connection),
};

const emailProviders: Record<string, EmailProviderFactory> = {
  google: (connection: GoogleConnection) => new GoogleGmailProvider(connection),
  smtp: () => new SmtpProvider(),  // existing nodemailer/Brevo
};

const documentProviders: Record<string, DocumentProviderFactory> = {
  google: (connection: GoogleConnection) => new GoogleDriveProvider(connection),
  r2: () => new R2Provider(),  // existing Cloudflare R2
};

// Usage in API routes:
const provider = resolveCalendarProvider(clinicId, doctorId);
// → checks: does doctor have Google Calendar connected?
//   yes → GoogleCalendarProvider
//   no  → falls through to DB-backed slot system (existing behavior)
```

---

## 4. Google-Specific Provider Implementations

### 4.1 GoogleCalendarProvider (`src/lib/providers/calendar/google.ts`)

```
Key behaviors:
- Uses Google Calendar API v3 (googleapis npm package)
- Incremental sync via syncToken (stored in GoogleConnection.calendarSyncToken)
- Webhook push notifications via calendar watch channels
- Automatic Meet conferenceData injection when telemedicine is enabled
- Two-way sync: doctor blocks time in Google Calendar → ClinicAI respects it
  Doctor blocks time in ClinicAI → Google Calendar event created
- Double-booking prevention: checks busy/free via freebusy query before booking
- Timezone handling: uses clinic's configured timezone
- Rate limit handling: exponential backoff, max 3 retries
- Error mapping: translates Google API errors → user-friendly messages
```

### 4.2 GoogleMeetProvider (`src/lib/providers/meeting/google.ts`)

```
Key behaviors:
- Meet links are created via Calendar API conferenceData (no separate Meet API call needed)
- This means Meet is "free" when Calendar is connected — no extra scopes
- Stores the Meet link on both GoogleCalendarEvent (provider side) and Appointment (local side)
- Single Meet link per appointment — idempotent creation via requestId
- Join URL exposed to both doctor and patient
- No separate room lifecycle management (Meet handles that)
```

### 4.3 GoogleGmailProvider (`src/lib/providers/email/google.ts`)

```
Key behaviors:
- Uses Gmail API v1 (googleapis npm package)
- Sends from clinic's connected Gmail address
- HTML email with ClinicAI branding
- Rate limits: Gmail allows 2,000 messages/day for regular accounts
- Thread support: replies to same appointment thread
- Bounce/complaint handling: checks Gmail API for delivery status
```

### 4.4 GoogleDriveProvider (`src/lib/providers/documents/google.ts`)

```
Key behaviors:
- Uses Google Drive API v3 (googleapis npm package)
- Organizes files in folder structure:
  /ClinicAI/
    /Patients/
      /Ali Khan/
        Prescription_2026-08-07.pdf
        BloodReport_2026-08-07.pdf
    /Invoices/
    /LabReports/
- Uses drive.file scope (only sees files created by ClinicAI)
- Generates shareable links with viewer permission for patients
```

---

## 5. Token Management & Security

### 5.1 Token Storage

All OAuth tokens are AES-256-GCM encrypted before storage (reuse existing `encrypt()/decrypt()` from `src/lib/auth.ts`).

```
GoogleToken.accessToken  → encrypted
GoogleToken.refreshToken → encrypted
GoogleToken.idToken      → encrypted
```

### 5.2 Token Lifecycle (`src/lib/providers/google-token-manager.ts`)

```ts
interface TokenManager {
  /** Get valid access token, refreshing if needed */
  getAccessToken(connectionId: string): Promise<string>;

  /** Handle token refresh — called when API returns 401 */
  refreshTokens(connectionId: string): Promise<void>;

  /** Revoke all tokens for a connection */
  revokeConnection(connectionId: string): Promise<void>;

  /** Check if a scope is granted */
  hasScope(connectionId: string, scope: string): Promise<boolean>;

  /** Request additional scopes (returns redirect URL) */
  requestAdditionalScopes(connectionId: string, scopes: string[]): string;
}
```

### 5.3 Auto-Refresh Middleware

Every Google API call wraps through a retry layer:

```
1. Attempt API call with current access token
2. If 401 → refresh token using refresh_token
3. If refresh succeeds → store new tokens → retry API call
4. If refresh fails → mark connection as 'expired' → notify clinic admin
5. Log every refresh to GoogleAuditLog
```

Google refresh tokens have these properties:
- Rotated on use (new refresh token issued with each refresh)
- Can expire if not used for 6 months
- Revoked if user changes password or removes app access
- Limited to 50 per user per app (not a concern — one per clinic)

### 5.4 Multi-Tenant Isolation

Every Google API call is scoped to a single `GoogleConnection` (which belongs to one `Clinic`). No cross-tenant token usage is possible because:

- `GoogleConnection.clinicId` enforces tenant ownership
- The `connectionId` → token lookup always goes through clinic-scoped queries
- `getAccessToken()` requires both `connectionId` and `clinicId`

---

## 6. Booking Flow with Google Integration

### 6.1 Complete Sequence

```
Patient books appointment (any channel: WhatsApp, portal, manual)
  │
  ▼
ClinicAI checks availability
  ├─ Check DB Slot table
  ├─ If doctor has Google Calendar connected:
  │   └─ GoogleCalendarProvider.getBusySlots() → merge with DB slots
  │
  ▼
Slot confirmed → Create Appointment (DB)
  │
  ▼
If Calendar connected:
  ├─ GoogleCalendarProvider.createEvent()
  │   ├─ conferenceData (Meet link) if telemedicine and Calendar connected
  │   ├─ Attendees: doctor.email + patient.email
  │   └─ Store GoogleCalendarEvent record
  │
  ▼
If Gmail connected:
  ├─ GoogleGmailProvider.sendEmail() — appointment confirmation
  │
  ▼
If telemedicine + Calendar connected:
  ├─ Meet link auto-created (via conferenceData in createEvent)
  ├─ Store Meet link on Appointment record
  ├─ Send Meet link via WhatsApp/SMS (existing notification system)
  │
  ▼
Doctor confirms (or auto-confirm if configured)
  │
  ▼
Reminder scheduled (existing cron system)
  └─ 24h, 2h, 30min reminders via WhatsApp/email
```

### 6.2 Reschedule Flow

```
Reschedule requested
  │
  ▼
Check new slot availability (DB + Calendar freebusy)
  │
  ▼
If Calendar connected:
  ├─ GoogleCalendarProvider.updateEvent() — change time
  ├─ Meet link stays the same (Google preserves it on reschedule)
  │
  ▼
Send reschedule notification (WhatsApp + email)
```

### 6.3 Cancel Flow

```
Cancellation requested
  │
  ▼
Update Appointment status → cancelled
  │
  ▼
If Calendar connected:
  ├─ GoogleCalendarProvider.deleteEvent()
  │
  ▼
Send cancellation notification
  ├─ WhatsApp (existing)
  └─ Gmail (if connected)
```

### 6.4 Two-Way Sync (Google Calendar → ClinicAI)

```
Google Calendar push notification received (webhook)
  │
  ▼
GoogleCalendarProvider.listEvents() with syncToken
  │
  ▼
Diff: new/updated/deleted events since last sync
  │
  ├─ New event by doctor (manual block in Google Calendar)
  │   └─ Create blocked Slot in DB (prevents booking in that window)
  │
  ├─ Updated event (doctor rescheduled in Google Calendar)
  │   └─ If linked to Appointment → reschedule the Appointment
  │   └─ If manual block → update Slot in DB
  │
  ├─ Deleted event
  │   └─ If linked to Appointment → cancel the Appointment
  │   └─ If manual block → release the blocked Slot
  │
  └─ Store new syncToken in GoogleConnection.calendarSyncToken
```

---

## 7. API Design

### 7.1 OAuth Endpoints

```
GET  /api/auth/google/signin
  → Redirects to Google OAuth consent screen
  → Passes ?connectionType=signin or ?connectionType=connect

GET  /api/auth/google/callback
  → Handles Google OAuth callback
  → Creates/link User, Account, GoogleConnection records
  → Redirects to dashboard

POST /api/auth/google/additional-scopes
  Body: { connectionId, scopes: ["https://www.googleapis.com/auth/calendar.events"] }
  → Returns redirect URL for incremental consent

GET  /api/auth/google/additional-scopes/callback
  → Handles incremental consent callback
  → Updates GoogleConnection.scopeSnapshot
```

### 7.2 Connection Management Endpoints

```
GET  /api/clinics/[id]/google/status
  → Returns: { connected, email, enabledFeatures: { calendar, meet, gmail, drive, ... } }

POST /api/clinics/[id]/google/toggle
  Body: { feature: "calendar", enabled: true }
  → If enabling a new feature with missing scopes, returns { needsConsent: true, consentUrl: "..." }

POST /api/clinics/[id]/google/disconnect
  → Revokes Google tokens, marks connection as 'revoked'

GET  /api/clinics/[id]/google/calendar/busy
  Query: { doctorId, start, end }
  → Returns merged busy slots (DB + Google Calendar)

POST /api/clinics/[id]/google/calendar/sync
  → Forces a full calendar sync
```

### 7.3 Modified Existing Endpoints

```
POST /api/appointments (booking)
  → Modified: after DB slot claim, calls CalendarProvider.createEvent()
  → Modified: if telemedicine, calls MeetingProvider.createMeeting()

PATCH /api/appointments/[id] (reschedule)
  → Modified: calls CalendarProvider.updateEvent()

DELETE /api/appointments/[id] (cancel)
  → Modified: calls CalendarProvider.deleteEvent()
```

### 7.4 Webhook Endpoints

```
POST /api/webhooks/google/calendar
  → Receives Google Calendar push notifications
  → Header: X-Goog-Channel-ID, X-Goog-Resource-ID
  → Triggers incremental sync

POST /api/webhooks/google/drive
  → Receives Google Drive change notifications
  → Triggers metadata refresh
```

---

## 8. Error Handling Strategy

| Scenario | Detection | Recovery | User-Facing Message |
|---|---|---|---|
| Expired access token | 401 from Google API | Auto-refresh via refresh_token | Transparent |
| Expired refresh token | Refresh returns 400 | Mark connection 'expired', notify clinic | "Google connection expired. Please reconnect." |
| Revoked permission | 403 with "access_denied" | Mark connection 'revoked' | "Google access was revoked. Please reconnect to restore features." |
| Google Calendar deleted | 404 on event operations | Log error, continue with DB-only | "Calendar event could not be synced. Booking is still confirmed." |
| Meet creation failed | Google API error on conferenceData | Create appointment without Meet, notify doctor | "Video call could not be created. Please use the in-app telemedicine." |
| Gmail send failed | Gmail API error | Queue for retry (3x), fall back to SMTP/Brevo | "Email could not be sent from your Gmail. We'll use the default email instead." |
| Rate limit hit | 429 from Google API | Exponential backoff (1s, 2s, 4s, 8s), max 3 retries | Transparent |
| Drive upload failed | Drive API error | Store in R2 as fallback | "File saved to cloud storage successfully." |
| Duplicate event | 409 from Calendar API | Use existing event ID (idempotent) | Transparent |
| Timezone mismatch | Event time doesn't match slot | Normalize to clinic timezone before comparison | Transparent |
| Network failure | fetch timeout (10s) | Retry 3x, then mark as transient error | "Calendar sync temporarily unavailable. Your booking is saved." |

### Fallback Hierarchy

```
1. Try Google Calendar/Meet/Gmail/Drive
2. If Google fails → fall back to existing systems:
   - Calendar → DB Slot system (no external sync)
   - Meet → LiveKit (existing, always available)
   - Email → SMTP/Brevo (existing)
   - Documents → Cloudflare R2 (existing)
3. Log failure to GoogleAuditLog
4. Update GoogleConnection.lastError
5. If persistent failures (3+ in 1h), notify clinic admin
```

---

## 9. Admin Dashboard UI

### Connection Status Card

```
┌─────────────────────────────────────────────────┐
│  Google Integration                    [Connected] │
│                                                   │
│  Connected as: dr.ahmed@clinic.com                │
│                                                   │
│  ┌─ Calendar ───────────────────────── [✓] ────┐ │
│  │  Syncing appointments automatically           │ │
│  │  Last sync: 2 minutes ago                     │ │
│  └────────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Google Meet ────────────────────── [✓] ────┐ │
│  │  Auto-generating video call links             │ │
│  │  Requires: Calendar enabled                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Gmail ─────────────────────────── [—] ────┐ │
│  │  Send appointment emails from your Gmail      │ │
│  │  [Enable Gmail]                                │ │
│  └────────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Google Drive ──────────────────── [—] ────┐ │
│  │  Auto-organize patient documents              │ │
│  │  [Enable Drive]                                │ │
│  └────────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Business Profile ──────────────── [—] ────┐ │
│  │  Read reviews, sync clinic info               │ │
│  │  [Connect Profile]                             │ │
│  └────────────────────────────────────────────────┘ │
│                                                   │
│  [Disconnect Google]                               │
└─────────────────────────────────────────────────┘
```

### Permission Status Display

```
┌─────────────────────────────────────────────────┐
│  Granted Permissions                              │
│                                                   │
│  ✓ See your primary Google Account email          │
│  ✓ See your personal info                         │
│  ✓ Manage your calendars                          │
│  — Send email on your behalf      [Grant access]  │
│  — See and download your files   [Grant access]   │
└─────────────────────────────────────────────────┘
```

---

## 10. Tech Stack Additions

| Package | Purpose | Why |
|---|---|---|
| `googleapis` | Google Calendar, Gmail, Drive, Meet APIs | Official Google SDK, handles auth + API calls |
| `google-auth-library` | OAuth2 client for Google APIs | Already bundled with googleapis |
| `next-auth` v4 | OAuth framework | Already installed, just needs activation |
| `@auth/prisma-adapter` | next-auth + Prisma integration | Standard adapter for DB sessions |
| `gaxios` | HTTP client with retry/backoff | Used by googleapis internally, we'll use for retry logic |

---

## 11. Folder Structure

```
src/
├── lib/
│   ├── providers/
│   │   ├── registry.ts              # Provider factory registry
│   │   ├── calendar/
│   │   │   ├── types.ts             # CalendarProvider interface + types
│   │   │   ├── google.ts            # GoogleCalendarProvider
│   │   │   └── fallback.ts          # DB-only slot system (default)
│   │   ├── meeting/
│   │   │   ├── types.ts             # MeetingProvider interface + types
│   │   │   ├── google.ts            # GoogleMeetProvider
│   │   │   └── livekit.ts           # LiveKitProvider (refactor existing)
│   │   ├── email/
│   │   │   ├── types.ts             # EmailProvider interface + types
│   │   │   ├── google.ts            # GoogleGmailProvider
│   │   │   └── smtp.ts              # SmtpProvider (refactor existing)
│   │   ├── documents/
│   │   │   ├── types.ts             # DocumentProvider interface + types
│   │   │   ├── google.ts            # GoogleDriveProvider
│   │   │   └── r2.ts                # R2Provider (refactor existing)
│   │   └── google-token-manager.ts  # Token refresh, encryption, lifecycle
│   ├── google/
│   │   ├── oauth.ts                 # next-auth Google provider config
│   │   ├── scopes.ts                # Scope constants + incremental helpers
│   │   └── webhooks.ts              # Calendar/Drive push notification handlers
│   └── ...
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/       # next-auth route handler
│   │   │   ├── google/
│   │   │   │   ├── signin/route.ts
│   │   │   │   ├── callback/route.ts
│   │   │   │   └── additional-scopes/route.ts
│   │   ├── clinics/[id]/google/
│   │   │   ├── status/route.ts
│   │   │   ├── toggle/route.ts
│   │   │   ├── disconnect/route.ts
│   │   │   ├── calendar/
│   │   │   │   ├── busy/route.ts
│   │   │   │   └── sync/route.ts
│   │   │   └── ...
│   │   └── webhooks/google/
│   │       ├── calendar/route.ts
│   │       └── drive/route.ts
│   └── dashboard/clinic/settings/
│       └── google-integration/      # Connection management UI
```

---

## 12. Implementation Roadmap

### Phase 1: Foundation (OAuth + User Identity)
1. Activate next-auth with Google provider
2. Add `User`, `Account`, `Session`, `VerificationToken` tables (Prisma migration)
3. Build unified identity linking (Google User → existing ClinicAdmin/Doctor/etc.)
4. "Continue with Google" button on login/signup pages
5. Add `GoogleConnection`, `GoogleToken`, `GoogleAuditLog` tables
6. Build token manager (encrypt/decrypt/refresh)
7. Connection management API (`/api/clinics/[id]/google/status`, disconnect)

### Phase 2: Calendar + Meet
1. Build `CalendarProvider` interface + `GoogleCalendarProvider`
2. Build `MeetingProvider` interface + `GoogleMeetProvider`
3. Integrate into booking flow (createEvent on appointment create)
4. Integrate into cancel/reschedule flows
5. Two-way sync via webhook push notifications
6. Busy/free slot merging (Google Calendar + DB Slots)
7. Admin UI: calendar status, toggle, sync button

### Phase 3: Gmail
1. Build `EmailProvider` interface + `GoogleGmailProvider`
2. Refactor existing `EmailProvider` calls in notification system
3. Integrate into appointment confirmation, reminder, cancellation emails
4. Admin UI: Gmail toggle

### Phase 4: Drive + Business Profile
1. Build `DocumentProvider` interface + `GoogleDriveProvider`
2. Integrate into prescription/invoice/report upload flows
3. Auto-create folder structure on first connection
4. Add `GoogleBusinessProfile` model + sync
5. Admin UI: Drive toggle, Business Profile connect

### Phase 5: Polish + Edge Cases
1. Comprehensive error mapping (Google API → user-friendly messages)
2. Rate limit handling with exponential backoff
3. Connection health monitoring
4. Audit log dashboard
5. Disconnect cleanup (webhook channels, cached data)

### Phase 6: Provider Expansion (future)
1. `OutlookCalendarProvider` (Microsoft 365)
2. `TeamsProvider` (Microsoft Teams)
3. `ZoomProvider`
4. `AppleCalendarProvider`

---

## 13. Best Practices

1. **Token encryption at rest**: All OAuth tokens encrypted with AES-256-GCM (reuse existing `encrypt()`/`decrypt()` from `auth.ts`)
2. **Least privilege**: Incremental scopes — never request more than needed now
3. **Idempotent operations**: All Google API mutations use requestId to prevent duplicates on retry
4. **Graceful degradation**: Every Google feature has a fallback — Calendar→DB slots, Meet→LiveKit, Gmail→Brevo, Drive→R2
5. **Tenant isolation**: Every query includes `clinicId`. Token access is always through `connectionId + clinicId`.
6. **Audit everything**: Every token refresh, scope change, and API failure logged to `GoogleAuditLog`
7. **Webhook verification**: Google push notifications verified via channel token HMAC
8. **Sync tokens**: Incremental calendar sync via syncToken — never full list on every poll
9. **Watch channels**: Auto-renew calendar watch channels before expiry (channel TTL is ~1 week)
10. **Timezone normalization**: Always convert to clinic's timezone before comparing calendar events to DB slots
11. **User-friendly errors**: Map Google API errors to actionable messages (per taste: no raw technical strings)
12. **Neutral labeling in UI**: Use "Calendar Sync", "Video Call Links", "Email Sending" — not "Google Calendar", "Google Meet", "Gmail" (per taste: don't expose internal tech stack to clinics)
