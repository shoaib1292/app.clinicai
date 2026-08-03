# ClinicAI Internal API Reference

## Overview

ClinicAI uses **Next.js App Router route handlers** for its entire API layer. All endpoints live under `apps/dashboard/src/app/api/` in the Turborepo structure (previously `src/app/api/`).

**Base URL (dev)**: `http://localhost:8000/api`  
**Base URL (prod)**: `https://app.clinicsai.pk/api`

---

## Response Format

Every endpoint returns a standard envelope:

```json
// Success
{ "ok": true, "data": { ... } }

// Error
{ "ok": false, "error": "Human-readable message" }
```

HTTP status codes are:
- `200` — Success
- `400` — Bad request (validation error)
- `401` — Unauthorized (no session / expired)
- `403` — Forbidden (wrong role / insufficient scope)
- `404` — Not found
- `409` — Conflict (duplicate, slot already taken)
- `500` — Internal server error

---

## Authentication

All authenticated routes use **JWT session cookies**.

### Session Cookie
- **Name**: `clinicsai_session`
- **Type**: HttpOnly, Secure, SameSite=Lax
- **Expiry**: 24 hours

### Refresh Cookie
- **Name**: `clinicsai_refresh`
- **Type**: HttpOnly, Secure, SameSite=Lax
- **Expiry**: 7 days

### Bearer Token (Fallback)
If no cookie is present, the `Authorization: Bearer <token>` header is checked.

### User Types
| Type | Description | Scope |
|------|-------------|-------|
| `platform_admin` | Full platform access | All |
| `platform_staff` | Granular scopes | Assigned per-staff |
| `clinic_admin` | Own clinic only | Clinic-scoped |
| `receptionist` | Own clinic, booking + patients | Clinic-scoped |
| `doctor` | Own clinic, own appointments | Clinic-scoped |

### Auth Flow
```
Login → session cookie (24h) + refresh cookie (7d)
Expired session → middleware auto-refreshes via /api/auth/refresh
Expired refresh → redirect to /login
```

---

## Rate Limiting

- **All routes**: Protected by in-memory rate limiter (configurable via `RATE_LIMIT_*` env vars)
- **Public endpoints**: Stricter limits (50 requests/hour for booking)
- **Webhook endpoints**: Separate limits for Evolution/Meta

---

## Endpoint Index

| Domain | Routes | Auth Required |
|--------|--------|--------------|
| [Auth](./auth.md) | 11 endpoints | Mixed |
| [Appointments](./appointments.md) | 9 endpoints | Clinic-scoped |
| [Patients](./patients.md) | 4 endpoints | Clinic-scoped |
| [Doctors](./doctors.md) | 6 endpoints | Clinic-scoped |
| [Services](./services.md) | 3 endpoints | Clinic-scoped |
| [Conversations](./conversations.md) | 8 endpoints | Clinic-scoped |
| [Schedules](./schedules.md) | 2 endpoints | Clinic-scoped |
| [Slots](./slots.md) | 1 endpoint | Clinic-scoped |
| [Analytics](./analytics.md) | 4 endpoints | Clinic-scoped / Platform |
| [Payments](./payments.md) | 5 endpoints | Mixed |
| [Billing](./billing.md) | 1 endpoint | Clinic-scoped |
| [Clinics](./clinics.md) | 9 endpoints | Platform / Clinic-scoped |
| [Platform](./platform.md) | 6 endpoints | Platform |
| [Agent](./agent.md) | 3 endpoints | Clinic-scoped |
| [WhatsApp](./whatsapp.md) | 6 webhook endpoints | Implicit |
| [Public](./public.md) | 2 endpoints | None |
| [Feedback](./feedback.md) | 4 endpoints | Mixed |
| [Notifications](./notifications.md) | 4 endpoints | Auth required |
| [Campaigns](./campaigns.md) | 5 endpoints | Clinic-scoped |
| [Templates](./templates.md) | 3 endpoints | Clinic-scoped |
| [Quick Replies](./quick-replies.md) | 4 endpoints | Clinic-scoped |
| [Automation Rules](./automation-rules.md) | 4 endpoints | Clinic-scoped |
| [LLM Keys](./llm-keys.md) | 4 endpoints | Platform |
| [Pricing Rules](./pricing-rules.md) | 2 endpoints | Platform |
| [Leads](./leads.md) | 3 endpoints | Mixed |
| [Realtime](./realtime.md) | 1 endpoint | Auth required |
| [Health](./health.md) | 1 endpoint | None |

---

## Convention: Query Parameters

All list endpoints use standard pagination:

```
?cursor=<lastId>      // Cursor-based pagination (use last item's ID)
&limit=20             // Items per page (default: 20, max: 200)
&search=<term>        // Text search across name/phone fields
&status=<value>       // Filter by status enum
```

---

## Convention: Date/Time Formats

- **Dates**: `YYYY-MM-DD` (e.g., `2026-07-01`)
- **DateTimes**: ISO 8601 UTC (`2026-07-01T10:00:00.000Z`)
- **Times**: `HH:MM` in 24-hour format (local PKT time, no timezone offset stored)
- **Timezone**: All clinics operate in Asia/Karachi (UTC+5). Times are stored as UTC in database, displayed as local.
