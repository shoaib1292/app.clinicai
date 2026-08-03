# Public API (Unauthenticated)

Endpoints accessible without authentication. Used by public booking links and webhook consumers.

---

## Public Booking

```
POST /api/public/book
```

**Auth**: None  
**Rate Limit**: 50 requests/hour per IP  
**CAPTCHA**: Cloudflare Turnstile required after 25 requests/hour

**Request Body**:
```json
{
  "doctorId": "string (required)",
  "slotId": "string (required)",
  "patientPhone": "string (required, 03XX format)",
  "patientName": "string (optional)",
  "patientGender": "male | female (optional)",
  "serviceId": "string (optional)",
  "paymentMode": "cash | online (default: cash)",
  "turnstileToken": "string (required if >25 requests/hr)"
}
```

**Response**: `{ ok: true, data: { appointment: {...}, tokenNo: number } }`

Same booking logic as authenticated booking (lock → patient → no-show check → fees → slot → reminders → events).

### Booking Link Format

Booking links are JWT-signed tokens appended to the public booking page:

```
https://clinicsai.pk/b/<jwt-token>
```

The token encodes: `{ clinicId, doctorId?, serviceId?, exp }`. The public booking page verifies the JWT server-side before rendering the booking UI.

---

## Public Slots Availability

```
GET /api/public/slots
```

**Auth**: None

**Query Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `doctorId` | `string` | Required |
| `date` | `YYYY-MM-DD` | Required |

**Response**: `{ ok: true, data: { slots: [{ id, startTime, endTime, durationMin, status }] } }`

Returns only slots with `status: "open"`. Filters out past slots and expired holds (>5 min).

---

## Slot Hold (for Public Booking)

```
POST /api/public/slots/hold
```

**Auth**: None  
**Rate Limit**: Same as booking

**Request Body**:
```json
{
  "slotId": "string (required)"
}
```

Marks a slot as `held` for 5 minutes. Prevents double-booking during the public booking flow. The slot auto-releases after 5 minutes if not booked.

**Response**: `{ ok: true, data: { held: true, expiresAt: "ISO datetime" } }`

---

## Health Check

```
GET /api/health
```

**Auth**: None

**Response**:
```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-07-07T10:00:00.000Z",
    "uptime": 123456,
    "checks": {
      "database": "connected",
      "redis": "connected"
    }
  }
}
```

---

## Webhooks (see WhatsApp docs)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/evolution` | POST | Evolution WhatsApp webhook |
| `/api/webhooks/meta` | POST | Meta Cloud API webhook |
| `/api/webhooks/jazzcash` | POST | JazzCash payment IPN |

---

## Lead Submission

```
POST /api/leads
```

**Auth**: None (landing page form)

**Request Body**:
```json
{
  "clinicName": "string (required)",
  "adminName": "string (required)",
  "whatsappNumber": "string (required, 03XX format)",
  "city": "string (optional)",
  "monthlyAppointments": "number (optional, rough estimate)"
}
```
