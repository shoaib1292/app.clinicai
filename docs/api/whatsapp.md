# WhatsApp Integration API

ClinicAI supports two WhatsApp connection methods: **Evolution API** (QR-based, self-hosted Baileys) and **Meta Cloud API** (official WhatsApp Business API). Clinics can choose either or both.

**Webhook Domain**: `app.clinicai.pk`  
**Agent Language**: Urdu (Roman-Urdu and Nastaliq script) — WhatsApp AI agent communicates in Urdu. All UI remains in English.

---

## Evolution API (QR-Based)

Self-hosted unofficial WhatsApp gateway using Baileys. Clinics scan QR code to connect.

### Create Instance

```
POST /api/clinics/[id]/evolution/create
```

**Auth**: `clinic_admin` (own clinic only)

**Request Body**:
```json
{
  "mode": "qr | code",
  "phone": "string (required for code mode)"
}
```

- `qr` mode: Returns QR code image for scanning
- `code` mode: Returns pairing code to enter in WhatsApp

**Response**: `{ ok: true, data: { instanceName, qrCode?, pairingCode?, status } }`

### Check Status

```
GET /api/clinics/[id]/evolution/status
```

Polls connection status. Checks DB first, then Evolution API, auto-syncs.

**Response**: `{ ok: true, data: { status: "connecting | connected | disconnected | error", qrCode?, connectedAt? } }`

### Disconnect

```
POST /api/clinics/[id]/evolution/disconnect
```

Logs out and deletes the Evolution instance. Also callable by `platform_admin`.

---

## Meta Cloud API (Official)

Official WhatsApp Business API. Requires Meta Business verification.

### Connect

```
POST /api/clinics/[id]/meta/connect
```

**Auth**: `clinic_admin` (own) or `platform_admin`

**Request Body**:
```json
{
  "phoneNumberId": "string (required)",
  "accessToken": "string (required, permanent token)",
  "wabaId": "string (required)",
  "phone": "string (optional)"
}
```

Credentials are validated against Meta's API before saving.

---

## Webhook: Evolution API

```
POST /api/webhooks/evolution
```

**Auth**: Implicit — resolves clinic by instance name from Evolution's webhook payload.

### Incoming Message Flow:
1. Authenticate (Evolution API key in headers)
2. Filter: ignore group messages, status updates
3. Dedup: prevent duplicate processing (5s window)
4. Resolve clinic by instance name → DB lookup
5. Find/Create patient + conversation
6. Persist inbound message
7. Run AI agent (`runAgent()`)
8. Persist agent reply
9. Send reply via Evolution API

### Connection Events Handled:
- `qrCode` — New QR code received
- `statusInstance` — Connection status change
- `receivedCallback` — Message delivery callback

---

## Webhook: Meta Cloud API

```
POST /api/webhooks/meta
```

**Auth**: HMAC-SHA256 signature verification (`x-hub-signature-256` header).

### Same flow as Evolution, with Meta-specific differences:
- Voice messages need media download from Meta's servers before STT
- Template messages use Meta's template API
- Status callbacks: `sent`, `delivered`, `read`, `failed`

### Webhook Verification (GET):
```
GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<value>
```

Matches `hub.verify_token` against `META_VERIFY_TOKEN` env var.

---

## Message Sending

### Via Evolution
```typescript
// Text
sendEvolutionMessage(instanceName, to: "923001234567", text: "Message in Urdu")

// Voice
sendEvolutionVoice(instanceName, to, audioBase64, format: "ogg")
```

### Via Meta
```typescript
// Text (conversational)
sendMetaMessage(phoneNumberId, accessToken, to, text)

// Template (24h+ window or proactive)
sendMetaTemplate(phoneNumberId, accessToken, to, templateName, languageCode, components)

// Voice (uploads to Meta Media API first)
sendMetaAudio(phoneNumberId, accessToken, to, audioBase64, format)
```

### Sending Strategy (Worker):
1. Try Evolution API first (no template costs)
2. Fallback to Meta Cloud API
3. Log failures to `FilteredMessageLog`

---

## WhatsApp Connection Model (Prisma)

```prisma
model WhatsAppConnection {
  id           String   @id @default(uuid())
  clinicId     String   @unique
  provider     WhatsAppProvider // evolution | meta
  instanceName String?
  phone        String?
  status       String?  // disconnected | connecting | connected | error
  qrCode       String?  // Base64 QR image
  connectedAt  DateTime?
  disconnectedAt DateTime?
  metaPhoneNumberId String?
  metaAccessToken    String?
  metaWabaId         String?
  clinic       Clinic   @relation(fields: [clinicId])
}
```
