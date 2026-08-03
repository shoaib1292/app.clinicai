# ClinicAI — Complete Learning Roadmap (End-to-End)

> **Simple alfaz me:** Ye roadmap aapko ClinicAI project ko coding level par samajhne ke liye hai — web dashboard, mobile apps, WhatsApp integration, AI agent, database, aur production deployment sab kuch. Har phase ko step-by-step follow karein.

---

## 📋 Project Ka Overview (Ek Nazar Mein)

ClinicAI ek **WhatsApp-first AI receptionist** hai jo Pakistani clinics ke liye banaya gaya hai. Ye appointment booking, reminders, follow-ups, payments, aur campaigns automate karta hai — 24/7, Urdu/English mein.

### 4 Main Parts Hain:

| Part | Kya Hai | Tech Stack |
|------|---------|------------|
| **1. Web Dashboard** | Clinic staff, doctors, receptionists, platform admins ke liye | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| **2. Landing Page** | Marketing website (clinicsai.pk) | Next.js 16, separate app |
| **3. Mobile App (Staff)** | Clinic staff ka mobile app | Expo SDK 56, React Native, TypeScript |
| **4. Patient App** | Patient ka mobile app | Expo SDK 56, React Native (separate project) |

### Backend Architecture (3 Services):

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Next.js    │    │  Realtime    │    │  Worker      │
│  App :8000  │◄──►│  Socket.io   │    │  BullMQ      │
│  (API+UI)   │    │  :3003       │    │  (cron jobs) │
└──────┬──────┘    └──────────────┘    └──────┬───────┘
       │                                      │
       └──────────────┬───────────────────────┘
                      │
         ┌────────────┴────────────┐
         │  PostgreSQL 16 + Redis 7 │
         └─────────────────────────┘
```

---

## 🗺️ Phase 1: Foundation — TypeScript, React, Next.js (1-2 hafte)

> **Kyun:** Project TypeScript + React 19 + Next.js 16 use karta hai. Bina inki bunyadi samajh ke aage badhna mushkil hai.

### 1.1 TypeScript (3-4 din)
- Types, interfaces, generics samajh lo
- `tsconfig.json` kaise kaam karta hai
- **Practice:** Apna chhota sa TypeScript project banao

### 1.2 React 19 (4-5 din)
- Components, props, state, hooks (`useState`, `useEffect`, `useContext`)
- React 19 ke naye features: `use` hook, actions
- **shadcn/ui** components samajh lo (ye project mein use hote hain)
- **Practice:** Todo app banao with shadcn/ui

### 1.3 Next.js 16 App Router (4-5 din)
- App Router vs Pages Router
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- API Routes (`app/api/` folder)
- Server Components vs Client Components
- **Key concept:** `async` components, `cookies()`, `headers()`
- **Practice:** Blog app banao with Next.js 16

### 1.4 Tailwind CSS 4 (2 din)
- Utility classes, responsive design
- `tailwind.config.ts` / `postcss.config.mjs`
- **Practice:** Landing page banao

---

## 🗄️ Phase 2: Database & ORM — Prisma + PostgreSQL (1-2 hafte)

> **Kyun:** Poora backend database par chal raha hai. Prisma schema samajhna zaroori hai.

### 2.1 PostgreSQL Basics (2-3 din)
- Tables, relationships (1:1, 1:Many, Many:Many)
- Soft deletes (`deletedAt` column)
- Multi-tenancy concept (har clinic ka apna data)

### 2.2 Prisma ORM (1 hafta)
- **File:** `prisma/schema.prisma` — yahi pe project ka poora data model hai
- Models, enums, relations samajh lo
- **Key concept:** `AsyncLocalStorage` se tenant isolation
  - File: `src/lib/db.ts` — har query automatically clinicId se filter hoti hai
  - File: `src/lib/tenant.ts` — clinic context set/clear karta hai
- Prisma queries: `findMany`, `create`, `update`, `delete`
- **Practice:** Apna blog schema banao with Prisma

### 2.3 Database Schema Deep Dive (2-3 din)
Project ka schema bahut bada hai. Isko sections mein padho:

**Platform Layer:**
- `PlatformAdmin` — platform ke admin (2FA mandatory)
- `Clinic` — har clinic ka info
- `PricingRule` — platform admin hi set kar sakta hai

**Clinic Layer (tenant-scoped):**
- `ClinicAdmin`, `Doctor`, `Receptionist` — users
- `Patient`, `PatientFamilyMember` — patients
- `Service`, `Schedule`, `ScheduleOverride` — doctors ki availability
- `Slot` — appointment slots (open/held/booked/blocked)
- `Appointment`, `AppointmentFees` — appointments
- `Conversation`, `Message` — WhatsApp conversations
- `PaymentProof`, `CreditLedger`, `Invoice` — payments/billing
- `WhatsAppConnection` — Evolution/Meta credentials
- `Reminder` — appointment reminders
- `QuickReplySnippet`, `NotificationTemplate` — templates
- `Campaign` — WhatsApp broadcasts
- `AutomationRule` — condition-trigger-action rules
- `AuditLog` — platform admin ke liye audit trail

**Practice:** Schema ko diagram banao (draw.io ya paper par)

---

## 🌐 Phase 3: Web Dashboard — Next.js App (2-3 hafte)

> **Kyun:** Ye main application hai. 5 role-based dashboards hain.

### 3.1 Authentication System (3-4 din)
- **File:** `src/lib/auth.ts` — JWT, bcrypt, TOTP 2FA, AES-256-GCM encryption
- **File:** `src/lib/session.ts` — session management, cookie auth
- **File:** `src/app/api/auth/` — login, logout, refresh, 2FA verify, signup
- **Key concepts:**
  - JWT tokens (access + refresh)
  - 2FA optional hai (agar user ne enable kiya ho tohi require karo)
  - Passwords bcrypt se hash hote hain
  - Secrets (LLM keys, Meta tokens) AES-256-GCM se encrypt hote hain
- **Practice:** Auth system banao with JWT + bcrypt

### 3.2 API Routes (5-7 din)
- **Location:** `src/app/api/` — ~60 REST endpoints
- Har endpoint ka pattern:
  ```
  src/app/api/auth/login/route.ts
  src/app/api/appointments/route.ts
  src/app/api/clinics/[id]/route.ts
  ```
- **Key files:**
  - `src/lib/api.ts` — API response helpers
  - `src/lib/validator.ts` — Zod validation
  - `src/lib/filter.ts` — query filtering
- **Practice:** CRUD API banao with Next.js API routes

### 3.3 Dashboard Structure (5-7 din)
5 user roles ke dashboards hain:

**Platform Admin Dashboard:**
- `src/app/dashboard/platform/` — clinics, staff, pricing, analytics, audit, calendar

**Clinic Admin Dashboard:**
- `src/app/dashboard/clinic/` — doctors, receptionists, services, patients, appointments, billing, analytics, agent, templates, bank accounts, booking links, feedback

**Doctor Dashboard:**
- `src/app/dashboard/doctor/` — appointments, patients, conversations

**Receptionist Dashboard:**
- `src/app/dashboard/receptionist/` — book appointments, patients, conversations, payments

**Shared Components:**
- `src/app/dashboard/layout.tsx` — sidebar, header, navigation
- `src/components/` — reusable UI components

### 3.4 Frontend Components (3-4 din)
- `src/components/ui/` — shadcn/ui components
- `src/components/` — custom components (dashboard-shell, notifications, etc.)
- `src/hooks/` — React hooks (use-toast, use-realtime, use-mobile)
- **Key:** `use-realtime.ts` — Socket.io client for live updates

---

## 🤖 Phase 4: AI Agent System (1-2 hafte)

> **Kyun:** Ye project ka core hai — LLM-powered WhatsApp AI receptionist.

### 4.1 Agent Architecture
- **File:** `src/lib/agent.ts` — main entrypoint (re-exports from `src/lib/agent/`)
- **Folder:** `src/lib/agent/` — modular agent system:
  - `types.ts` — AgentContext, AgentMessage types
  - `llm-config.ts` — ZAI SDK config
  - `chat.ts` — LLM call
  - `prompt.ts` — system prompt builder
  - `tools-defs.ts` — 13 AI tools definitions
  - `execute-tool.ts` — tool execution (13 cases)
  - `parse-text-calls.ts` — parse LLM text output for tool calls
  - `fallback.ts` — rule-based fallback (agar LLM fail kare)
  - `summarizer.ts` — old conversations summarize karta hai
  - `proactive.ts` — proactive tools (reminders, follow-ups)
  - `index.ts` — `runAgent()` orchestrator

### 4.2 AI Tools (13 tools)
- `list_available_slots` — doctor ki available slots dikhaye
- `book_appointment` — appointment book kare
- `cancel_appointment` — cancel kare
- `get_patient_history` — patient ka history
- `send_message` — WhatsApp pe message bheje
- `transfer_to_human` — human agent se connect kare
- `get_doctor_info` — doctor ka info
- `update_patient_profile` — patient profile update
- `reschedule_appointment` — reschedule kare
- `get_appointment_details` — appointment details
- `process_payment` — payment process kare
- `get_clinic_info` — clinic ka info
- `handle_unknown` — unknown queries handle kare

### 4.3 LLM Integration
- **SDK:** `z-ai-web-dev-sdk` (ZAI) — LLM, STT, TTS, VLM
- **Voice:** `src/lib/voice.ts` — Whisper STT + OpenAI TTS
  - Urdu, English, Roman-Urdu, Punjabi, Pashto support
  - WhatsApp voice notes (OGG Opus / AAC M4A) handle karta hai
- **VLM:** `src/lib/vlm-payment.ts` — payment screenshot analyze karta hai

### 4.4 Practice
- Ek simple chatbot banao with tool calling
- ZAI SDK ya OpenAI SDK se try karo

---

## 💬 Phase 5: WhatsApp Integration (1 hafta)

> **Kyun:** Ye project ka sabse important part hai — WhatsApp pe AI agent chalana.

### 5.1 Two WhatsApp Methods
Project dono methods support karta hai:

**1. Evolution API (QR-based):**
- **File:** `src/lib/evolution.ts`
- QR code scan karke WhatsApp connect hota hai
- Clinic staff "QR Code" ya "Phone Number Pairing" dekhte hain (internal tech nahi dikhate)
- Sirf basic message replies ke liye — automation/campaigns nahi
- Ban risk: agar number naya ho to messages bhi nahi jaye sakte

**2. Meta Cloud API (Official WABA):**
- **File:** `src/lib/meta.ts`
- Official WhatsApp Business API
- Templates, bulk broadcasts, proactive reminders ke liye
- Meta Cloud API default/recommended hai
- Clinic apni Meta Business account connect karti hai

### 5.2 Webhooks
- **Evolution:** `src/app/api/webhooks/evolution/route.ts`
- **Meta:** `src/app/api/webhooks/meta/route.ts`
- WhatsApp se aane wale messages yahan aate hain
- Agent ko trigger hota hai

### 5.3 Error Handling
- `friendlyEvoError()` function — technical errors ko user-friendly banata hai
- "no available server" → "Evolution server is starting up. Please wait 30 seconds..."
- "ECONNREFUSED" → "Cannot reach the WhatsApp server..."
- Koi bhi raw technical error user ko nahi dikhaye

### 5.4 Rate Limiting & Safety
- `EVOLUTION_DAILY_CAP=50` — daily message cap (new numbers ke liye)
- `REMINDER_SEND_DELAY_MS=3000` — har message ke beech 3s ka gap
- `AGENT_REPLY_GAP_MS=2500` — per-patient reply gap
- `EVO_PER_PATIENT_HOURLY_CAP=10` — ek patient ko 1 hour mein max 10 replies

---

## ⚙️ Phase 6: Background Workers & Realtime (3-4 din)

### 6.1 Worker Process
- **Folder:** `worker/` — BullMQ background jobs
- **Files:**
  - `index.ts` — main worker (sandbox + production modes)
  - `automation-worker.ts` — automation rules
  - `campaign-worker.ts` — WhatsApp campaigns
  - `webhook-worker.ts` — webhook processing
- **Cron jobs:** `src/cron/` — reminders, analytics, retention, templates, feedback
- **Modes:**
  - Sandbox: `STORE_TYPE=memory` (no Redis, cron directly)
  - Production: `STORE_TYPE=redis` (BullMQ workers)

### 6.2 Realtime Service
- **Folder:** `mini-services/realtime/` — Socket.io server
- **Port:** 3003 (fixed)
- **Channels:**
  - `clinic:{id}:queue` — slot booked/cancelled, patient checked in
  - `clinic:{id}:ops` — doctor status, agent escalation
  - `clinic:{id}:conversations` — new messages
  - `doctor:{id}` — status changes, new appointments
- **Frontend:** `src/hooks/use-realtime.ts` — Socket.io client

### 6.3 Store Abstraction
- **File:** `src/lib/store.ts` — RedisStore ya MemoryStore auto-select
- KV get/set, locks, pub/sub, queues — same interface dona tarah ke store mein

---

## 📱 Phase 7: Mobile Apps (1-2 hafte)

> **Important:** Do alag-alag Expo projects hain — clinic staff app aur patient app.

### 7.1 Clinic Staff Mobile App
- **Folder:** `clinicai-mobile/`
- **Expo SDK:** 56.0.1
- **React:** 19.2.3 (exact pin — caret ^ nahi, kyunki react-native-renderer exact match chahiye)
- **Structure:**
  ```
  clinicai-mobile/
  ├── app/
  │   ├── (auth)/     — login, signup, 2FA, forgot password
  │   ├── (dashboard)/
  │   │   ├── (clinic)/    — clinic admin screens
  │   │   ├── (doctor)/    — doctor screens
  │   │   ├── (platform)/  — platform admin screens
  │   │   └── (receptionist)/ — receptionist screens
  │   ├── _layout.tsx
  │   └── index.tsx
  ├── components/
  │   ├── features/   — feature-specific components
  │   ├── layout/     — header, screen layout, tab bar
  │   └── ui/         — reusable UI (button, card, avatar, etc.)
  ├── lib/
  │   ├── api.ts      — API client with offline cache
  │   ├── auth.ts     — JWT token management (SecureStore)
  │   ├── cache.ts    — offline caching
  │   ├── store.tsx   — Zustand state management
  │   └── utils.ts
  ├── hooks/
  │   ├── useApi.ts       — API calls with caching
  │   ├── useRealtime.ts  — Socket.io client
  │   ├── useOfflineSync.ts — offline data sync
  │   └── useTheme.ts
  └── types/
  ```

### 7.2 Patient Mobile App
- **Folder:** `clinicai-patient-app/`
- **Expo SDK:** 56.0.1
- **Structure:**
  ```
  clinicai-patient-app/
  ├── app/
  │   ├── (main)/     — chat, clinics, history
  │   ├── login.tsx
  │   ├── _layout.tsx
  │   └── index.tsx
  ├── lib/
  └── types/
  ```
- **Note:** Ye sirf patient ke liye hai — booking, chat, history

### 7.3 Mobile App Key Features
- **Offline support:** `useOfflineSync.ts` — offline data cache karta hai
- **Realtime:** `useRealtime.ts` — Socket.io se live updates
- **Auth:** `expo-secure-store` se JWT tokens save karte hain
- **OTP:** WhatsApp pe OTP bheja jata hai (SMS nahi — costs zyada aate hain)
- **Phone input:** `+92` (Pakistan) default country code

### 7.4 Practice
- Expo project banao, API se data fetch karo
- Offline caching implement karo

---

## 🏗️ Phase 8: Infrastructure & Deployment (1 hafta)

### 8.1 Docker & Docker Compose
- **File:** `docker-compose.yml` — dev environment
- **File:** `docker-compose.prod.yml` — production
- **Services:** app, realtime, worker, postgres, redis, caddy
- **Dockerfiles:** `Dockerfile` (Next.js), `Dockerfile.worker` (worker), `mini-services/realtime/Dockerfile`

### 8.2 Caddy Reverse Proxy
- **File:** `Caddyfile` — auto-TLS, routing, rate limiting
- **Domains:**
  - `clinicsai.pk` → landing page
  - `app.clinicsai.pk` → dashboard
  - `api.clinicsai.pk` → API + webhooks
  - `wa.clinicsai.pk` → Evolution API (optional)
- **Routing:** Socket.io ke liye `XTransformPort=3003` query param

### 8.3 Environment Variables
- **File:** `.env.example` — sabhi variables ka template
- **Key variables:**
  - `DATABASE_URL`, `JWT_SECRET`, `APP_ENCRYPTION_KEY`
  - `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`
  - `ZAI_API_KEY` — LLM/STT/TTS/VLM
  - `STORE_TYPE=redis` (production)
  - `REDIS_URL`, `REDIS_PASSWORD`
  - `BREVO_API_KEY` — email (REST API, xkeysib- prefix)
  - `CLOUDINARY_URL` — image storage
  - `JAZZCASH_*` — payment gateway

### 8.4 Production Checklist
1. PostgreSQL 16 (port 5433)
2. Redis 7 (port 6379, password protected)
3. Caddy (ports 80/443, auto-TLS)
4. Evolution API (WhatsApp QR)
5. Meta Cloud API credentials
6. ZAI API key (LLM/STT/TTS/VLM)
7. Brevo API key (emails)
8. Cloudinary (images)
9. JazzCash (payments)
10. Sentry DSN (error tracking)

### 8.5 Monitoring
- **Uptime Kuma** — uptime monitoring
- **Loki + Grafana** — log aggregation
- **Sentry** — error tracking (`@sentry/nextjs`)

---

## 🐛 Phase 9: Bug Finding & Code Review (Ongoing)

> **Yeh sabse important hai — production level par jana hai.**

### 9.1 Common Bug Areas to Check

**Authentication & Security:**
- [ ] JWT token expiry handling
- [ ] 2FA bypass (agar user ne enable nahi kiya toh bhi require karta hai koi?)
- [ ] Password strength validation
- [ ] Session fixation attacks
- [ ] Cross-tenant data access (tenant isolation check)
- [ ] SQL injection (Prisma se bacha deta hai, lekin raw queries check karo)
- [ ] XSS in message rendering (WhatsApp messages HTML mein aate hain)
- [ ] Rate limiting on auth endpoints

**WhatsApp Integration:**
- [ ] Evolution API error handling (fetch failed, ECONNREFUSED)
- [ ] Meta webhook verification
- [ ] Message ordering (WhatsApp messages sometimes out of order aate hain)
- [ ] Duplicate message handling (same message multiple times aata hai)
- [ ] Media download failures (voice notes, images)
- [ ] Ban risk — daily caps exceed hone ka kya hoga?

**Appointment System:**
- [ ] Slot race conditions (2 patients same slot book kar sakte hain?)
- [ ] Double booking prevention
- [ ] No-show detection accuracy
- [ ] Timezone handling (PKT specifically)
- [ ] Schedule override conflicts

**Payment System:**
- [ ] Payment proof validation (amount, bank match)
- [ ] VLM analysis accuracy (screenshot se amount nikalna)
- [ ] Double payment prevention
- [ ] Refund handling

**AI Agent:**
- [ ] Infinite loop prevention (agent apni hi messages process karta hai?)
- [ ] Context window overflow (long conversations)
- [ ] Tool call validation (galat parameters)
- [ ] Fallback accuracy (rule-based fallback kab trigger hota hai?)
- [ ] Voice note processing (format detection, STT accuracy)

**Database:**
- [ ] N+1 query problems
- [ ] Missing indexes on frequently queried columns
- [ ] Soft delete cleanup (deleted records purane rehte hain)
- [ ] Transaction isolation (concurrent updates)

**Mobile Apps:**
- [ ] Offline sync conflicts (same data offline edit karo)
- [ ] Token refresh race conditions
- [ ] Large list rendering (FlashList use hai, check karo)
- [ ] Memory leaks (Socket.io connections)

### 9.2 How to Find Bugs

**Step 1: Read the code carefully**
- Har API route padho — kya validation hai? kya auth check hai?
- Har component padho — kya state management sahi hai?

**Step 2: Run the tests**
```bash
npm test              # Vitest unit tests
npm run test:e2e      # Playwright end-to-end tests
npm run test:load:booking   # Load testing
```

**Step 3: Manual testing**
- Dev server start karo: `npm run dev`
- Saare features try karo:
  - Login → 2FA → Dashboard
  - Book appointment → Cancel → Reschedule
  - WhatsApp chat → Voice note → Payment
  - Campaign send → Analytics view
  - Settings change → Billing

**Step 4: Edge cases test karo**
- Network disconnect ho jaye to?
- Token expire ho jaye to?
- Server crash ho jaye to?
- Concurrent users same slot book karen to?

---

## 📚 Phase 10: Production-Level Skills (Ongoing)

### 10.1 Code Quality
- **ESLint** — `npm run lint`
- **TypeScript** — `npx tsc --noEmit` (type checking)
- **Prettier** — code formatting
- **Conventional commits** — commit messages

### 10.2 Testing
- **Unit tests:** Vitest (`src/components/__tests__/`, `src/lib/__tests__/`)
- **E2E tests:** Playwright (`e2e/`)
- **Load tests:** k6 (`load-tests/`)
- **Coverage:** Aim for 80%+ coverage

### 10.3 Performance
- **Database:** Query optimization, indexing
- **Caching:** Redis cache strategies
- **Frontend:** Code splitting, lazy loading, image optimization
- **Backend:** Request batching, connection pooling

### 10.4 Monitoring & Observability
- **Sentry** — error tracking with breadcrumbs
- **Logs** — structured logging
- **Metrics** — response times, error rates
- **Alerts** — critical error notifications

### 10.5 Security
- **OWASP Top 10** — check against all 10
- **Input validation** — Zod schemas on every endpoint
- **Output encoding** — XSS prevention
- **Rate limiting** — Caddy rate limits + app-level
- **Secrets management** — environment variables, encryption at rest
- **Audit logging** — all admin actions logged

---

## 🎯 Weekly Plan (12-14 hafte total)

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1 | TypeScript + React + Next.js basics | Todo app with shadcn/ui |
| 2 | Prisma + PostgreSQL | Blog with CRUD operations |
| 3 | Auth system | JWT + bcrypt + 2FA auth system |
| 4 | Web dashboard (part 1) | Clinic admin dashboard (doctors, services) |
| 5 | Web dashboard (part 2) | Appointments, patients, billing |
| 6 | AI Agent system | Simple chatbot with tool calling |
| 7 | WhatsApp integration | Evolution API + Meta Cloud API |
| 8 | Workers + Realtime | Background jobs + Socket.io |
| 9 | Mobile apps | Expo staff app (basic screens) |
| 10 | Deployment | Docker + Caddy + production setup |
| 11 | Bug hunting | Find 10+ bugs, write tests |
| 12 | Optimization | Performance, security, monitoring |

---

## 🔧 Development Commands (Yaad Rakho)

```bash
# Development (3 services together)
npm run dev

# Individual services
npm run dev:next      # Next.js only
npm run dev:realtime  # Socket.io only
npm run dev:worker    # Worker only

# Database
npm run db:push       # Push schema to DB
npm run db:generate   # Generate Prisma client
npm run db:seed       # Seed database
npm run db:migrate    # Create migration

# Testing
npm test              # Unit tests (Vitest)
npm run test:watch    # Watch mode
npm run test:e2e      # E2E tests (Playwright)

# Build & Deploy
npm run build         # Production build
docker compose -f docker-compose.prod.yml up -d  # Deploy

# Mobile
cd clinicai-mobile && npm start       # Expo dev server
cd clinicai-patient-app && npm start  # Patient app
```

---

## 📖 Must-Read Files (Priority Order)

**Start here (understanding the project):**
1. `README.md` — overview
2. `package.json` — dependencies
3. `.env.example` — configuration
4. `prisma/schema.prisma` — data model
5. `docker-compose.yml` — infrastructure

**Backend core:**
6. `src/lib/db.ts` — database + tenant isolation
7. `src/lib/auth.ts` — authentication
8. `src/lib/session.ts` — session management
9. `src/lib/tenant.ts` — multi-tenancy
10. `src/lib/agent/index.ts` — AI agent orchestrator
11. `src/lib/evolution.ts` — WhatsApp Evolution API
12. `src/lib/meta.ts` — WhatsApp Meta Cloud API
13. `src/lib/store.ts` — Redis/memory store
14. `src/lib/voice.ts` — voice processing
15. `src/lib/payment.ts` — payment validation

**API routes (pick 5-10 to study):**
16. `src/app/api/auth/login/route.ts`
17. `src/app/api/appointments/route.ts`
18. `src/app/api/webhooks/evolution/route.ts`
19. `src/app/api/webhooks/meta/route.ts`
20. `src/app/api/agent/message/route.ts`

**Frontend:**
21. `src/app/dashboard/layout.tsx` — dashboard layout
22. `src/app/dashboard/clinic/page.tsx` — clinic dashboard
23. `src/components/dashboard-shell.tsx` — shell component
24. `src/hooks/use-realtime.ts` — realtime hook

**Workers:**
25. `worker/index.ts` — worker main
26. `mini-services/realtime/index.ts` — Socket.io server

**Mobile:**
27. `clinicai-mobile/lib/api.ts` — mobile API client
28. `clinicai-mobile/lib/auth.ts` — mobile auth
29. `clinicai-mobile/app/(dashboard)/(clinic)/index.tsx` — clinic screen

---

## 💡 Pro Tips

1. **Terminal commands chhote rakho** — long paths wrap ho sakte hain. Shell variables use karo.

2. **Dev server:** `localhost:3000` = landing, `localhost:8000` = app, dono tunnel se access karo.

3. **Windows users:** `.\dev.ps1` PowerShell script use karo for quick startup.

4. **Phone numbers:** `+92` (Pakistan) default country code. Clinic ke calling number ke liye alag field.

5. **UI:** Black/neutral monochrome palette hai — koi chromatic colors mat add karo.

6. **WhatsApp labels:** Clinic-facing UI mein "Evolution API" mat likho — "QR Code" ya "Phone Number Pairing" likho.

7. **OTP:** WhatsApp pe bhejo, SMS mat bhejo (costs zyada aate hain).

8. **Pricing:** Clinics ke liye free, patients ko PKR 50 per appointment.

9. **Onboarding:** Trial nahi — direct clinic admin signup, 1000 PKR free credits.

10. **Email:** Stalwart mail server use karo (self-hosted, Rust-based).

---

## 🚀 Final Advice

> **"Code ko line-by-line mat padho. Pehle badi picture samjho, phir chhote parts."**

1. **Pehle poore project ka architecture samjho** — 3 services, 4 apps, kaise connect hain
2. **Ek feature ko end-to-end trace karo** — e.g., appointment booking: mobile → API → DB → agent → WhatsApp → realtime
3. **Bugs dhoondne ke liye edge cases try karo** — network failure, concurrent access, invalid input
4. **Production ke liye socho** — security, performance, monitoring, scaling
5. **Practice karo** — apne projects banate raho, sirf padhna kafi nahi

**Remember:** 12-14 hafte mein poora project samajhne ka try karo. Har din 2-3 ghante lagao. Jaldi karo toh samajh nahi aayega.

**Koi bhi step skip mat karo — har phase agle ki bunyadi hai.**
