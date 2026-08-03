# Auth API

Authentication, session management, password reset, and 2FA.

---

## Signup

```
POST /api/auth/signup
```

Self-service clinic registration. Creates Clinic + ClinicAdmin + 1000 PKR free credits.

**Request Body**:
```json
{
  "clinicName": "string (required)",
  "adminName": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required, min 8 chars)",
  "phone": "string (optional)",
  "city": "string (optional)"
}
```

**Response**: Auto-logs in — returns session cookie + `{ ok: true, data: { user, clinic } }`.

---

## Login

```
POST /api/auth/login
```

Supports all 5 user types. Auto-detects type from email lookup.

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "totpCode": "string (required only if 2FA enabled)"
}
```

**Response**:
- Normal: `{ ok: true, data: { user, clinic?, scopes?, twoFactorEnabled: false } }`
- 2FA enabled: `{ ok: true, data: { twoFactorRequired: true, pendingToken, type } }` — client must call `/api/auth/2fa/verify`

**2FA Policy**: 2FA is **never enforced** at login unless the user has already enabled it in their settings. If a user hasn't set up 2FA, they log in directly — no additional step.

---

## Logout

```
POST /api/auth/logout
```

**No body required**. Blacklists refresh JTI. Clears `clinicsai_session` and `clinicsai_refresh` cookies.

**Response**: `{ ok: true, data: null }`

---

## Get Current User (Me)

```
GET /api/auth/me
```

Returns hydrated session payload + clinic info. Used to bootstrap the dashboard after page load.

**Response**: `{ ok: true, data: { user: { id, email, name, type, clinicId, ... }, clinic: { id, name, city, agentName, ... } } }`

---

## Refresh Token

```
POST /api/auth/refresh
```

Automatically called by middleware when session is expired but refresh cookie is valid. Blacklists old JTI, issues new session + refresh cookies.

**Request**: Refresh token from cookie or `Authorization: Bearer <refreshToken>` header.

---

## Change Password

```
POST /api/auth/change-password
```

**Auth**: `requireAuth()` (any user type)  
**Body**: `{ currentPassword: "string", newPassword: "string" }`

---

## Forgot Password

```
POST /api/auth/forgot-password
```

**No auth required**. Sends password-reset email (if email exists). Always returns success to prevent email enumeration.

**Body**: `{ email: "string" }`

---

## Reset Password

```
POST /api/auth/reset-password
```

**No auth required**. Validates reset token from email link.

**Body**: `{ token: "string", password: "string" }`

---

## 2FA Setup

```
POST /api/auth/2fa/setup
```

**Auth**: Valid session required.  
Generates TOTP secret + QR code data URL + 8 backup codes.

**Response**: `{ ok: true, data: { secret, qrCodeDataUrl, backupCodes: [...] } }`

---

## 2FA Verify (Setup or Login)

```
POST /api/auth/2fa/verify
```

**Auth**: Session (setup) or pending 2FA cookie (login).  
**Body**: `{ code: "string (6-digit TOTP)" }`

Two modes:
1. **Setup verification**: Confirms 2FA setup is valid, enables 2FA on account
2. **Login challenge**: Validates TOTP code, issues real session on success

---

## 2FA Disable

```
POST /api/auth/2fa/disable
```

**Auth**: Valid session required.  
**Body**: `{ code: "string (6-digit TOTP)" }`

Requires valid TOTP code to confirm ownership before disabling.

---

## Session Structure (JWT Payload)

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "type": "clinic_admin | receptionist | doctor | platform_admin | platform_staff",
  "clinicId": "clinic-id (null for platform)",
  "scopes": ["clinic:read", "clinic:write"],
  "iat": 1234567890,
  "exp": 1234654290,
  "jti": "unique-jwt-id"
}
```
