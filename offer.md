# Offers & Referrals System — ClinicAI

## Vision

Clinic AI ka growth engine: clinics apne **offers** banaen (discounts jo new patients laen), aur patients apne **personalized referral links** se doost/family ko la kar dono ko fayda paen. Rewards **credit-based** hain (cash-out nahi — fraud-safe), aur referrer ko reward **appointment complete hone ke baad** milta hai. Coupon code optional hai; **personalized referral link primary mechanism** hai (bade platforms jaisa).

## Current State (verified)

- `src/app/dashboard/clinic/offers/page.tsx` — placeholder "coming soon", no client component
- No Offer/Coupon/Referral model in `prisma/schema.prisma`; `computeFees` (`src/lib/schedule.ts:137`) is pure addition — no discount hook
- Booking paths: public link `/b/[token]` → `POST /api/public/book`; patient portal `/p/{slug}/book` → `POST /api/patient/clinics/[id]/book`; staff `POST /api/appointments`; WhatsApp agent (`src/lib/agent/execute-tool.ts`)
- Portal booking currently computes **zero fees** (`book/route.ts:87`) — must be fixed to service-based fees for discounts to be meaningful
- Appointment completion: `POST /api/appointments/[id]/checkin` (receptionist/doctor) sets `status: 'completed'` and increments `patient.totalVisits`
- WhatsApp send helper: `sendWhatsAppMessage(clinicId, phone, message)` in `src/lib/followup-rules.ts:260` (Evolution → Meta fallback)
- `Patient` model has `clinicId + phoneHash` unique key, `totalVisits`, `optInMarketing` — patient dedupe by `hashPhone(phone + clinicId)`

## Data Model (prisma/schema.prisma — new models)

```prisma
model Offer {
  id            String    @id @default(cuid())
  clinicId      String
  title         String
  description   String?
  type          String    @default("percent") // percent | flat
  value         Int       // percent value (1-100) or flat PKR
  maxDiscount   Int?      // percent offers ke liye cap (e.g. Rs 500 max off)
  appliesTo     String    @default("all")     // all | new_patients
  serviceId     String?
  doctorId      String?
  promoCode     String?   @unique             // optional manual code (UPPERCASE)
  isReferral    Boolean   @default(false)
  startsAt      DateTime?
  endsAt        DateTime?
  limit         Int?      // total redemptions cap
  usedCount     Int       @default(0)
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  clinic        Clinic    @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  redemptions   OfferRedemption[]
}

model OfferRedemption {
  id             String   @id @default(cuid())
  clinicId       String
  offerId        String
  appointmentId  String   @unique
  patientId      String
  discountAmount Int
  appliedBy      String   @default("promo") // promo | referral | auto
  createdAt      DateTime @default(now())
  offer          Offer    @relation(fields: [offerId], references: [id], onDelete: Cascade)
}

model ReferralProgram {
  id                  String   @id @default(cuid())
  clinicId            String   @unique
  enabled             Boolean  @default(true)
  refereeDiscount     Int      @default(100) // PKR off for the new patient
  referrerReward      Int      @default(100) // PKR credit for the referrer
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  clinic              Clinic   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
}

model ReferralCode {
  id           String   @id @default(cuid())
  clinicId     String
  patientId    String
  code         String   @unique // e.g. "A7K2P9"
  createdAt    DateTime @default(now())
  patient      Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  events       ReferralEvent[]
  @@index([clinicId])
}

model ReferralEvent {
  id                String    @id @default(cuid())
  clinicId          String
  referralCodeId    String
  referrerPatientId String
  refereePhoneHash  String
  refereePatientId  String?
  appointmentId     String?   @unique
  status            String    @default("booked") // booked | completed | cancelled | no_show | invalid
  rewardStatus      String    @default("pending") // pending | earned | void
  rewardAmount      Int       @default(0)
  discountApplied   Int       @default(0)
  createdAt         DateTime  @default(now())
  completedAt       DateTime?
  referralCode      ReferralCode @relation(fields: [referralCodeId], references: [id], onDelete: Cascade)
  @@index([clinicId])
  @@index([referrerPatientId])
}
```

**Existing model changes:**
- `Patient`: add `rewardBalance Int @default(0)` — clinic-scoped patient credit (referrer reward, redeemable on next booking)

## Discount / Referral Engine — `src/lib/discounts.ts` (new)

Pure functions + DB helpers (mirrors `computeFees` style):

- `getReferralProgram(clinicId)` — upsert lazy default (enabled, 100/100)
- `getOrCreateReferralCode(clinicId, patientId)` — generate unique 6-char code (crypto random base32, retry on collision)
- `validatePromoCode({ clinicId, code, serviceId?, doctorId?, patient })` → `{ offer, error? }`
  - checks: active, date window, limit (`usedCount < limit`), appliesTo (`new_patients` requires `patient.totalVisits === 0`), service/doctor match
- `resolveBookingDiscount({ clinicId, promoCode?, refCode?, refereePatient?, serviceId?, doctorId? })` → `{ offer?, discountAmount, referralCode?, error? }`
  - refCode resolution: find ReferralCode by `code` → must belong to same clinic → **self-referral guard** (`refereePatient.phoneHash !== referrerPatient.phoneHash` → reject) → discount = program.refereeDiscount
- `applyDiscountToFees(fees, discountAmount)` → `{ ...fees, discount, total: max(0, total - discount) }`
- `recordRedemption(...)` — create OfferRedemption (atomic `usedCount` increment via `updateMany({ usedCount: { increment: 1 } })` with `limit` recheck)

## Changes by File

### 1. Booking paths — discount application

**`src/app/api/public/book/route.ts`**
- `BookBody` + `promoCode?: string`, `refCode?: string`
- After patient upsert + service resolution: `resolveBookingDiscount(...)` → if offer/referral valid, `applyDiscountToFees` → store `discountAmount`
- Create `AppointmentFees` with `discount` field added to schema (`discount Int @default(0)`, `total` = discounted)
- If referral: create `ReferralEvent` (status `booked`, discountApplied) + `OfferRedemption` (appliedBy `referral`/`promo`)
- Platform fee debit: only on `max(0, platformFee - discount)` remaining platform share (discount eats doctorFee first, then platformFee — detail in engine)

**`src/app/api/appointments/route.ts` (staff)** — same `promoCode?/refCode?` support (optional; keeps staff flows consistent)

**`src/app/api/patient/clinics/[id]/book/route.ts` (portal)**
- **Portal fee fix (prerequisite):** resolve service (`body.serviceId` fallback `findFirst({ doctorId, clinicId })`), `computeFees({ doctorFee: service.baseFee, extraClinicFee: service.extraClinicFee, platformFeeDefault, platformFeeOverride })` instead of zeros; create `AppointmentFees` row; keep credit debit on platform share
- `promoCode?/refCode?` in body → same `resolveBookingDiscount` → discount → `totalFee`/`doctorFee` adjusted
- Referral event + redemption records
- Auto-apply `patient.rewardBalance` on booking if > 0 (patient's own credit — referrer redeems own reward): `discount += min(rewardBalance, totalFee)`, decrement balance

**`src/lib/agent/execute-tool.ts`** — NOT in V1 scope (user chose website/booking-link/portal). Noted as future work.

### 2. Public booking UI — `src/app/b/[token]/`

**`page.tsx`** — read `searchParams.ref` (referral code) and pass `initialRefCode` to client.

**`public-booking-client.tsx`**
- `const [promoCode, setPromoCode]` + `refCode` state (initialized from URL)
- Confirm step: "Promo code / Referral" row with input + Apply button; calls new `POST /api/offers/validate` for preview discount; shows discount line in fee breakdown when applied
- `handleBook`: include `promoCode`/`refCode` in body
- Done screen: **"Refer a friend"** card — shows patient's referral link (call `POST /api/referral/my-code`) with **Copy Link** + **Share on WhatsApp** (`https://wa.me/?text=<link>`)
- `preselectedDoctorId` flow unchanged

### 3. Referral short links — `src/app/r/[clinicSlug]/[code]/page.tsx` (new)
- Looks up clinic by slug → finds `ReferralCode` → generates booking token via `generateBookingToken` (`src/lib/booking-token.ts`) → `redirect(`/b/${token}?ref=${code}`)`
- Unknown slug/code → `notFound()`

### 4. Referral reward on completion — `src/app/api/appointments/[id]/checkin/route.ts`
- After `status: 'completed'` update: find `ReferralEvent` where `appointmentId`, `status: 'booked'`
- Mark `status: 'completed'`, `rewardStatus: 'earned'`, `completedAt`, `rewardAmount = program.referrerReward`
- `Patient.rewardBalance += rewardAmount` on referrer patient
- WhatsApp: `sendWhatsAppMessage(clinicId, referrerPhone, "...")` — "Aapke referral ke appointment complete ho gayi! Rs 100 credit aapke account me add ho gaya." (uses `sendWhatsAppMessage` from `src/lib/followup-rules.ts`)
- `late_no_show` → referral `status: 'no_show'`, `rewardStatus: 'void'`

**`src/app/api/appointments/[id]/cancel/route.ts`** — on cancellation, mark referral `status: 'cancelled'`, `rewardStatus: 'void'`.

### 5. New API routes

- **`/api/offers/route.ts`** — `GET` (list clinic offers incl. usage counts), `POST` (create; validate percent 1–100 / flat ≥ 1; promoCode uniquify uppercase)
- **`/api/offers/[id]/route.ts`** — `PATCH` (edit, toggle active), `DELETE` (soft: `active: false`)
- **`/api/offers/validate/route.ts`** — `POST { code }` → `{ ok, discountAmount, title }` (public preview; no session required — used by booking UI)
- **`/api/referral/my-code/route.ts`** — `POST` (patient portal / done screen; gets-or-creates code; returns `{ code, link }`)
- **`/api/referral/config/route.ts`** — `GET/PATCH` clinic's ReferralProgram (dashboard)
- **`/api/offers/analytics/route.ts`** — `GET` (clinic_admin) — redemptions count/amount, referral bookings, rewards given, new patients via referral, top referrers

All follow `src/lib/api.ts` (`ok/err/handle`) + `requireClinicScope()` / `requirePatientAuth()` conventions; mutations call `auditLog`.

### 6. Dashboard — `src/app/dashboard/clinic/offers/`

**`page.tsx`** (server) — fetch clinic, offers (with `_count.redemptions`), referral program, analytics; render `OffersClient`.

**`offers-client.tsx`** (new, `'use client'`) — pattern from `services-client.tsx`:
- Tabs: **Offers | Referral Program | Analytics**
- Offers: card/table list (title, type badge, value, target, validity, limit progress, active Switch) + Create Offer dialog (type, value, appliesTo, service/doctor Select, promoCode, start/end dates, limit) + edit/toggle/delete
- Referral Program: enabled Switch, refereeDiscount + referrerReward inputs, shareable link preview (`/r/{slug}/{code}`), Save via `/api/referral/config`
- Analytics: stat cards (Active Offers, Redemptions, Referral Patients, Referral Appointments, Rewards Given PKR, New Patients) + top referrers table

### 7. Patient portal — `/p/[clinic-slug]/`

- **`book/[doctorId]/page.tsx`** — BookingSummary fees from service (fix hardcoded zeros); promo/ref code input + discount preview via `/api/offers/validate`; pass `rewardBalance` display "Rs X credit available — auto-applied"
- **`profile/page.tsx`** — "Rewards & Referrals" section: reward balance, referral link + copy/WhatsApp share, past referral events
- **`/api/patient/clinics/[id]/book`** uses shared engine (above)

### 8. WhatsApp notifications (reuse `sendWhatsAppMessage`)

- Referee booking confirmation: discount mention (booking routes already publish events; add message when discount > 0)
- Referrer reward earned on completion (checkin route, §4)
- New patient referral welcome optional (post-booking)

## Fraud Prevention (V1)

- Self-referral blocked (`refereePhoneHash !== referrerPatient.phoneHash`)
- Reward only on `status: 'completed'` (checkin); cancelled/no_show/late_no_show → void
- One redemption per appointment (`appointmentId @unique` on both `OfferRedemption` + `ReferralEvent`)
- Offer `limit` enforced with atomic `updateMany` increment; `usedCount` shown in dashboard
- `appliesTo: new_patients` requires `patient.totalVisits === 0`
- Promo code valid only for its clinic + service/doctor scope + active window

## Future (explicitly NOT V1 — noted in plan only)

- WhatsApp agent booking promo application (`execute-tool.ts`)
- Clinic-referral loop (Clinic A → Clinic B, credits after 10 completed)
- Public offers marketplace (browse clinics by offer)
- AI agent proactive offer promotion in conversation
- Referral analytics drill-down (per-code clicks, conversion)

## Migration & Verification

1. `npx prisma migrate dev --name offers-referrals` (adds tables + `Patient.rewardBalance` + `AppointmentFees.discount`)
2. `npx prisma generate`
3. `npm run build` or targeted `npx tsc --noEmit` (project tsc has OOM issue — use `NODE_OPTIONS=--max-old-space-size=4096` if needed)
4. `npm test` — add unit tests: `src/lib/__tests__/discounts.test.ts` (engine: percent/flat/cap/limit/new-patient/self-referral guard)
5. Manual E2E (sandbox WhatsApp):
   - Create offer (percent + promo `WELCOME20`) → open `/b/{token}` → apply code → discount shows in confirm → book → redemption recorded
   - Get referral code → `/r/{slug}/{code}` redirects with `?ref=` → book as different phone → referee discount at booking; complete via checkin → referrer `rewardBalance` +100 + WhatsApp message
   - Cancel before checkin → reward void
   - Self-referral (same phone) → rejected with friendly error
   - Portal: login patient → book with real fees + reward balance display → referral code shown in profile
   - Dashboard analytics reflect redemptions/referrals/rewards
