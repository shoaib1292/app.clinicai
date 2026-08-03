# Appointments API

The core booking system. All routes require `requireClinicScope()` — user must belong to the clinic.

---

## List Appointments

```
GET /api/appointments
```

**Query Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `status` | `AppointmentStatus` | Filter by status |
| `from` | `YYYY-MM-DD` | Start date |
| `to` | `YYYY-MM-DD` | End date |
| `doctorId` | `string` | Filter by doctor |
| `cursor` | `string` | Cursor for pagination (last item's ID) |
| `limit` | `number` | Items per page (default: 20) |

**Response**: `{ ok: true, data: { appointments: [...], nextCursor: string | null } }`

Each appointment includes: `patient { name, phone, gender }`, `doctor { name }`, `service { name }`, `fees { total }`, `slot { date, startTime, endTime }`, `status`, `channel`, `paymentStatus`, `createdAt`.

---

## Book Appointment

```
POST /api/appointments
```

**Request Body**:

```json
{
  "doctorId": "string (required)",
  "slotId": "string (required)",
  "patientPhone": "string (required, 03XX format)",
  "patientName": "string (optional, creates new patient if phone not found)",
  "patientGender": "male | female (optional)",
  "serviceId": "string (optional, defaults to first service)",
  "channel": "manual | link (default: manual)",
  "paymentMode": "cash | online (default: cash)"
}
```

**Response**: `{ ok: true, data: { appointment: {...}, tokenNo: number } }`

### Booking Flow:
1. Acquires distributed lock on slot
2. Finds or creates patient by phone hash
3. Checks no-show policy (3 no-shows in 90 days → blocked)
4. Resolves service + computes fees
5. Marks slot as `booked`
6. Creates appointment record
7. Creates fee breakdown + debits credit ledger
8. Schedules 3 reminders (T-24h, T-2h, T-30min)
9. Publishes realtime event `slot_booked`

---

## Get Appointment Detail

```
GET /api/appointments/[id]
```

**Response**: Full appointment with `patient`, `doctor`, `service`, `slot`, `fees`, `reminders`, `paymentProof`, `auditLog`.

---

## Update Appointment

```
PATCH /api/appointments/[id]
```

**Request Body** (all fields optional):

```json
{
  "status": "confirmed | held | booked",
  "paymentStatus": "paid | partial | unpaid",
  "paymentMode": "cash | online",
  "notes": "string",
  "checkInTime": "ISO datetime"
}
```

---

## Check In Patient

```
POST /api/appointments/[id]/checkin
```

Marks appointment as `completed` (if on time) or `late_no_show` (if >30min late). Auto-advances queue token.

**Response**: `{ ok: true, data: { status, checkInTime } }`

---

## Cancel Appointment

```
POST /api/appointments/[id]/cancel
```

**Request Body**:
```json
{ "reason": "string (optional)" }
```

### Refund Policy:
| Time Before Appointment | Platform Fee Refund |
|------------------------|---------------------|
| >4 hours | 100% |
| 2–4 hours | 50% |
| <2 hours | 0% |

Frees the slot, cancels reminders, credits ledger, publishes `slot_cancelled`.

---

## Mark No-Show

```
POST /api/appointments/[id]/no-show
```

Increments patient `noShowCount`. If 3+ no-shows in 90 days → flags for prepayment requirement.

---

## Reschedule Appointment

```
POST /api/appointments/[id]/reschedule
```

**Request Body**:
```json
{
  "newSlotId": "string (required)",
  "newDoctorId": "string (optional, same doctor if omitted)",
  "reason": "string (optional)"
}
```

Validates both appointments are in valid status. Acquires lock on new slot, releases old slot, updates appointment times, regenerates reminders.

---

## Bulk Cancel

```
POST /api/appointments/bulk-cancel
```

**Request Body**:
```json
{
  "appointmentIds": ["id1", "id2", ...],  // Max 100
  "reason": "string (optional)"
}
```

Processes each appointment through the cancel flow (refund, slot release, reminders, events).
