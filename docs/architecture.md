# ClinicAI — System Architecture

## Overview

ClinicAI is a **WhatsApp-first AI clinic automation platform** for Pakistani clinics. It automates appointment booking, reminders, follow-ups, and payments via a bilingual (Urdu/English) AI agent accessible through WhatsApp.

---

## High-Level Architecture

```
                           ┌─────────────────────────┐
                           │      Caddy (Reverse)      │
                           │  clinicsai.pk → Landing   │
                           │  app.clinicsai.pk → App   │
                           └────────┬────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
     ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
     │  Landing App     │  │  Dashboard App   │  │  Realtime        │
     │  Next.js :3000   │  │  Next.js :3001   │  │  Socket.io :3003 │
     │                  │  │                  │  │                  │
     │ - Landing page   │  │ - Dashboard UI   │  │ - WebSocket     │
     │ - Public booking │  │ - API routes     │  │ - Live events   │
     │ - Public payment │  │ - Login/Signup   │  │ - In-memory pub │
     └─────────────────┘  │ - Webhooks       │  │ - Redis (prod)  │
                           │ - Middleware      │  └─────────────────┘
                           │ - Prisma client   │
                           └────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼────────┐ ┌───▼────┐ ┌────────▼──────┐
           │  PostgreSQL 16   │ │ Redis  │ │  Worker (BullMQ)│
           │                  │ │        │ │                │
           │ - Clinics        │ │ - Cache │ │ - Reminders    │
           │ - Appointments   │ │ - Locks │ │ - Analytics    │
           │ - Patients       │ │ - Pub   │ │ - Automation   │
           │ - Conversations  │ │ - Sub   │ │ - Campaigns    │
           └──────────────────┘ └────────┘ └────────────────┘
```

---

## Component Details

### 1. Landing App (`apps/landing`, Port 3000)

**Purpose**: Public-facing marketing website and booking pages.

| Route | Description |
|-------|-------------|
| `/` | Landing page (hero, features, pricing, testimonials, FAQ) |
| `/b/<token>` | Public booking page (JWT-verified) |
| `/pay/<token>` | Public payment page |
| `/pay/success` | Payment success redirect |

**Characteristics**:
- No database access (fetches stats from internal API)
- ISR (Incremental Static Regeneration) for landing page sections
- Lightweight — minimal dependencies
- Deployed to `clinicsai.pk`

---

### 2. Dashboard App (`apps/dashboard`, Port 3001)

**Purpose**: Staff/admin dashboard, all API routes, webhook handlers.

| Route Group | Description |
|-------------|-------------|
| `/login`, `/signup` | Authentication pages |
| `/dashboard/clinic` | Clinic admin dashboard |
| `/dashboard/receptionist` | Receptionist booking + queue |
| `/dashboard/doctor` | Doctor view |
| `/dashboard/appointments` | Appointment management |
| `/dashboard/patients` | Patient records |
| `/dashboard/conversations` | WhatsApp conversation monitor |
| `/dashboard/agent-chat` | Agent testing console |
| `/dashboard/analytics` | Analytics dashboards |
| `/dashboard/billing` | Billing and ledger |
| `/dashboard/payments` | Payment proof management |
| `/dashboard/finance` | Financial reports |
| `/dashboard/settings` | Clinic settings |
| `/dashboard/platform` | Platform admin (B2B) |
| `/api/*` | All 86 API endpoints |
| `/api/webhooks/*` | Evolution/Meta/JazzCash webhooks |

**Characteristics**:
- Full Prisma client with PostgreSQL
- Middleware-based auth (JWT cookies → auto-refresh)
- Redis for distributed locks (production) / in-memory (sandbox)
- Sentry for error tracking
- Deployed to `app.clinicsai.pk`

---

### 3. Realtime Service (`mini-services/realtime`, Port 3003)

**Purpose**: WebSocket-based live updates for dashboard and public pages.

| Channel Pattern | Events |
|----------------|--------|
| `clinic:{id}:queue` | `slot_booked`, `slot_cancelled`, `patient_checked_in` |
| `clinic:{id}:ops` | `appointment_rescheduled`, `appointment_no_show`, `payment_proof_uploaded` |
| `clinic:{id}:conversations` | `message_received`, `agent_escalated` |
| `clinic:{id}:agent` | Agent tool call results, booking confirmations |
| `clinic:{id}:queue:live` | Token number changes, wait time estimates |

**Architecture**:
- Sandbox: In-memory pub/sub → HTTP webhook → Socket.io broadcast
- Production: Redis pub/sub → Socket.io broadcast
- Clients connect via `io("/?XTransformPort=3003")`
- Auto-reconnection with exponential backoff

---

### 4. Worker (`worker/`, Background Jobs)

**Purpose**: Process background jobs via BullMQ (production) or cron (sandbox).

| Queue | Jobs |
|-------|------|
| `clinicai-reminders` | Process pending reminders, send via Evolution/Meta |
| `clinicai-analytics` | Compute analytics snapshots |
| `clinicai-retention` | Process feedback requests, retention campaigns |
| `clinicai-automation` | Evaluate automation rules, execute actions |
| `clinicai-campaigns` | Process bulk campaign messages |
| `clinicai-notifications` | Send push notifications |

**Sandbox mode**: Uses `src/cron/index.ts` with setInterval-based scheduling (no Redis required).

---

## AI Agent Architecture

### Execution Modes
1. **Single-agent** (`src/lib/agent/run-agent-single.ts`): One LLM call handles everything — booking, info, triage, billing. 456 lines.
2. **Multi-agent** (`src/lib/agent/orchestrator.ts`): 5 specialized sub-agents routed by intent classifier.

### Sub-Agents (Multi-Agent Mode)
| Agent | Responsibilities | Tools |
|-------|-----------------|-------|
| Receptionist | Booking, cancel, reschedule, queue status, doctor status | `book_appointment`, `cancel_appointment`, `reschedule_appointment`, `list_available_slots`, `get_live_queue_status`, `get_doctor_status` |
| Billing | Payment questions, fees, payment proof | `get_clinic_info`, `attach_payment_proof` |
| Info | Clinic info, FAQs, directions, hours | `get_clinic_info` |
| Triage | Emergency detection, urgent symptoms | `transfer_to_human` |
| Follow-up | Post-appointment feedback, health check-ins | `get_patient_history` |

### Tool Set (12 AI tools)
```
list_available_slots → book_appointment → cancel_appointment → reschedule_appointment
get_patient_history → get_live_queue_status → get_doctor_status → transfer_to_human
get_family_member → add_family_member → get_clinic_info → attach_payment_proof
```

### Booking Flow (Agent)
1. Incoming WhatsApp → Evolution/Meta webhook → resolve clinic + patient
2. `runAgent()` → LLM decision → tool call
3. `executeTool('book_appointment')`:
   - Acquire slot lock → find/create patient → check no-show policy
   - Resolve service + fees → mark slot booked → create appointment
   - Create fee breakdown → debit credit ledger → schedule 3 reminders
   - Publish realtime events → publish automation events
4. Reply to patient in Urdu with confirmation details

---

## Data Flow: Appointment Lifecycle

```
Patient WhatsApp Message
        │
        ▼
  Evolution/Meta Webhook
        │
        ▼
  runAgent() → LLM → book_appointment tool
        │
        ▼
  executeTool() → Prisma write (appointment + fees + reminders)
        │
        ├──► store.publish('slot_booked') ──► Socket.io ──► Dashboard auto-refresh
        │
        ├──► publishAutomationEvent() ──► Worker evaluates rules
        │
        └──► sendEvolutionMessage() ──► Patient WhatsApp confirmation
```

---

## Security

| Layer | Mechanism |
|-------|-----------|
| Authentication | JWT cookies (HttpOnly, Secure, SameSite=Lax) |
| Authorization | Role-based + granular scopes (platform staff) |
| Middleware | `src/proxy.ts` — CORS, rate limiting, security headers, auth refresh |
| 2FA | Optional TOTP (setup in settings, only enforced if enabled) |
| Phone encryption | SHA-256 hashing for patient phone lookup, encryption at rest |
| CAPTCHA | Cloudflare Turnstile for public booking >25 req/hr |
| Rate limiting | In-memory (sandbox) / Redis (production) |
| Session rotation | JTI blacklisting on logout/refresh |
| Webhook verification | HMAC-SHA256 (Meta), API key (Evolution) |

---

## Environment Variables (Key)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (optional, for production) |
| `JWT_SECRET` | Session signing key |
| `REFRESH_SECRET` | Refresh token signing key |
| `EVOLUTION_API_URL` | Evolution API base URL |
| `EVOLUTION_API_KEY` | Evolution API key |
| `META_VERIFY_TOKEN` | Meta webhook verification token |
| `META_APP_SECRET` | Meta app secret for HMAC verification |
| `JAZZCASH_MERCHANT_ID` | JazzCash merchant ID |
| `JAZZCASH_PASSWORD` | JazzCash API password |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (TTS) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
| `SENTRY_DSN` | Sentry DSN for error tracking |
| `STORE_TYPE` | `memory` (sandbox) or `redis` (production) |

---

## Database Indexes

Key composite indexes for performance:

```sql
-- Appointment lookups
(clinicId, status, start)
(clinicId, doctorId, start)
(patientId, start DESC)

-- Slots
(doctorId, date, status)
(clinicId, date)

-- Messages
(conversationId, createdAt)
(clinicId, createdAt)

-- Patients
(clinicId, phoneHash)
```

---

## Deployment

| Environment | Host | Port | Command |
|-------------|------|------|---------|
| Dev | localhost | 8000 | `bun dev` (concurrent: next + realtime + worker) |
| Landing Dev | localhost | 3000 | `cd apps/landing && bun dev` |
| Dashboard Dev | localhost | 3001 | `cd apps/dashboard && bun dev` |
| Production | Docker | 3000 | `bun server.js` (standalone Next.js output) |

**Production Stack**:
- Caddy (reverse proxy + auto HTTPS)
- Docker Compose: Next.js + Realtime + Worker + PostgreSQL + Redis
- Subdomain routing: `clinicsai.pk` → landing, `app.clinicsai.pk` → dashboard
