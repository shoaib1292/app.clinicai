# ClinicAI — Meta WhatsApp Embedded Signup (Web Only)

**Date:** 2026-07-20
**Scope:** Add Meta's official **Embedded Signup** flow (Facebook Login popup → returns WABA ID + phone number ID + access token in one click) to the web dashboard's Meta Cloud API tab. Replaces the current **manual 4-field token paste** as the primary (recommended) path, keeping manual as a secondary fallback.

**Status:** Greenfield Facebook App (user creates it now). **Web only** (mobile `clinicai-mobile` out of scope).

---

## Current State (verified)
- Meta connect = **manual** `POST /api/clinics/[id]/meta/connect` (4 fields: phoneNumberId, accessToken, wabaId, phone).
- `sendMetaMessage` (src/lib/meta.ts) already works via Graph API.
- Webhook `src/app/api/webhooks/meta/route.ts` resolves clinic by **`WhatsAppConnection.phone` = display number** — so the display phone MUST be stored.
- `encrypt/decrypt` (AES-256-GCM, `APP_ENCRYPTION_KEY`) in src/lib/auth.ts. `metaTokenEnc` already encrypted.
- Env present: `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`. Missing: `META_APP_ID`, `META_OAUTH_REDIRECT_URI`.
- UI: `src/app/dashboard/clinic/whatsapp/whatsapp-client.tsx` (Meta tab = manual form).

## Decisions (confirmed with user)
1. **Flow:** Full Meta Embedded Signup (Facebook Login button).
2. **App:** Greenfield — plan includes Facebook App setup + dev-mode test + production App Review path.
3. **Scope:** Web only.
4. **Callback URL:** Fixed `https://app.clinicai.pk/api/meta/embedded-signup/callback`; `clinicId` carried in OAuth `state` (Meta allows only ONE redirect URI per app).
5. **Token model:** Long-lived (~60-day) user access token (Approach A). System-User token (Approach C) deferred.
6. **Manual form:** Kept as secondary fallback.
7. **Brand:** English UI, black monochrome. Neutralize existing amber webhook-note borders to `zinc`.

---

## Step 1 — Facebook App Prerequisites (user does in Meta dashboard)
1. Create **Business**-type app at developers.facebook.com → note `App ID` (`META_APP_ID`) + `App Secret` (`META_APP_SECRET`).
2. Add **WhatsApp** product.
3. Enable **Embedded Signup** (WhatsApp → Embedded Signup).
4. Add **OAuth redirect URI** exactly: `https://app.clinicai.pk/api/meta/embedded-signup/callback`.
5. Request scopes (in signup URL): `whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`.
6. Webhook already verified at `https://app.clinicai.pk/api/webhooks/meta` (existing GET handler).
7. **Dev Mode:** only app admins / test businesses can complete the flow → use this for initial WABA test.
8. **Production App Review:** submit recorded demo + privacy policy URL + business verification before GA.

## Step 2 — Env vars (`.env` + `.env.example`)
```
META_APP_ID=                         # new
META_APP_SECRET=                    # reuse existing
META_OAUTH_REDIRECT_URI=https://app.clinicai.pk/api/meta/embedded-signup/callback
META_STATE_TTL=600                   # CSRF state validity (seconds)
```

## Step 3 — Prisma (optional, additive)
Add to `WhatsAppConnection`:
```prisma
metaConnectedVia  String?   // 'manual' | 'embedded_signup'
metaTokenExpiresAt DateTime?
metaBusinessId    String?
```
(No migration risk — additive, tenant-filtered.)

## Step 4 — New helper `src/lib/meta-oauth.ts`
Reuse `META_GRAPH_URL`, `encrypt`, `decrypt`, `randomToken` (auth.ts), `store` (for state).
- `buildEmbeddedSignupUrl(state): string` → `https://signup.facebook.com/embedded/signup?client_id=META_APP_ID&redirect_uri=META_OAUTH_REDIRECT_URI&scope=...&state=...&prefill_fields=...&facebook_login_url=...`
- `exchangeCodeForToken(code)` → short-lived, then long-lived via `GET /oauth/access_token?grant_type=fb_exchange_token&fb_exchange_token=...`
- `getWabaInfo(wabaId, token)`, `getPhoneNumber(phoneNumberId, token)` (returns `display_phone_number`), `getBusinessInfo(businessId, token)`, `subscribeWebhook(wabaId, token)` → `POST /{wabaId}/subscribed_apps`
- `storeState(clinicId, state)` / `verifyState(clinicId, state)` via `store.set/get` (TTL `META_STATE_TTL`), single-use.

## Step 5 — Backend routes (new)
**`src/app/api/meta/embedded-signup/start/route.ts`**
- `requireType('clinic_admin','platform_admin')`; resolve `clinicId` from **session** (not path).
- Generate `state = randomToken(32)`; `storeState`; return `{ url }` via `ok(...)`.

**`src/app/api/meta/embedded-signup/callback/route.ts`**
- Meta redirects here with `code, state, business_id, waba_id, phone_number_id`.
- Verify `state` (delete on use). Mismatch → render HTML that `postMessage`es error + closes.
- Exchange `code` → long-lived token → `encrypt(token)`.
- `getPhoneNumber` → store its `display_phone_number` as `WhatsAppConnection.phone` (critical for webhook resolution).
- `subscribeWebhook(wabaId, token)` (best-effort).
- Transaction (mirror `connect/route.ts`): upsert `WhatsAppConnection` (`mode:'meta'`, `phone: displayPhoneNumber`, `metaPhoneId`, `metaTokenEnc`, `metaWabaId`, `metaBusinessId`, `status:'connected'`, `metaConnectedVia:'embedded_signup'`, `metaTokenExpiresAt`), update `Clinic.metaConnected/metaPhoneId/metaWabaId`, `auditLog({action:'meta_connected', metadata:{via:'embedded_signup'}})`.
- Render success HTML → `window.opener.postMessage({type:'meta_signup_done', ok:true})` → `window.close()`.

**`src/app/api/clinics/[id]/meta/connect/route.ts`** (one-line): also set `metaWabaId` on connection row for consistency.

## Step 6 — Frontend `whatsapp-client.tsx` (Meta tab)
- Add primary **"Connect with Meta"** button (black monochrome) → opens popup:
  ```ts
  const popup = window.open('', '_blank', 'width=700,height=800')
  const start = await fetch('/api/meta/embedded-signup/start', { method:'POST' })
  popup.location = (await start.json()).data.url
  window.addEventListener('message', onMsg)  // ok→toast+router.refresh+close; !ok→toast.error
  ```
- `signupLoading` state (spinner, disable button). Handle popup-X close.
- Keep manual 4-field form as secondary ("Enter token manually" disclosure).
- Neutralize amber webhook-note borders → `zinc` (brand taste).

## Step 7 — Security
- State/CSRF: 32-byte random, server-stored, 600s TTL, single-use.
- Token: `encrypt()` only; never log. Webhook `decryptMetaToken()` path unchanged.
- Redirect URI exact-match; no open redirect.
- Scope minimization (3 scopes).
- `metaTokenExpiresAt` stored; v1 surfaces "reconnect required" on expiry (refresh job = follow-up).

## Step 8 — Verification
**Dev WABA (Dev Mode, no review):**
1. App Dev Mode; your FB login = app admin.
2. Click "Connect with Meta" → complete signup → test WABA + test number created.
3. Confirm `subscribed_apps` → send test WhatsApp from verified recipient → inbound arrives at `/api/webhooks/meta`, clinic resolved (verify `WhatsAppConnection.phone` = `display_phone_number`).
4. Confirm `Clinic.metaConnected=true`, `metaTokenEnc` encrypted, `metaWabaId` set, `auditLog` row present.
5. Outbound `sendMetaMessage` delivers.

**Production App Review checklist:**
- [ ] Business verified (Business Manager)
- [ ] Privacy Policy URL live + linked
- [ ] Embedded Signup enabled; redirect URI exact
- [ ] Recorded demo submitted
- [ ] `business_management` + WhatsApp scopes approved
- [ ] Webhook E2E on `app.clinicai.pk`
- [ ] Token-expiry handling before GA

---

## Files touched (summary)
| File | Change |
|---|---|
| `.env` / `.env.example` | Add `META_APP_ID`, `META_OAUTH_REDIRECT_URI`, `META_STATE_TTL` |
| `prisma/schema.prisma` | +3 optional fields on `WhatsAppConnection` |
| `src/lib/meta-oauth.ts` | NEW helper module |
| `src/app/api/meta/embedded-signup/start/route.ts` | NEW |
| `src/app/api/meta/embedded-signup/callback/route.ts` | NEW |
| `src/app/api/clinics/[id]/meta/connect/route.ts` | set `metaWabaId` on connection |
| `src/app/dashboard/clinic/whatsapp/whatsapp-client.tsx` | "Connect with Meta" button + popup + states |

## Out of scope (follow-ups)
- Mobile embedded signup (`clinicai-mobile`)
- System-User token (Approach C) for non-expiring tokens
- Automated 60-day token refresh job (v1 = manual reconnect prompt)
- Multi-number rotation for large clinics
