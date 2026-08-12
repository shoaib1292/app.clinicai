# Google Cloud Console Setup — ClinicAI (2026 Latest UI)

**Important:** Google ne 2025-2026 me Console redesign kiya. Ab "Google Auth Platform" hai (Branding / Audience / Data Access / Clients tabs). Purane `APIs & Services → OAuth consent screen` wala UI nahi hai.

---

## Step 1: Project Banayein

1. https://console.cloud.google.com/projectcreate pe jayein
2. Project name: `ClinicAI` (ya kuch bhi) → **Create**
3. Top-left project selector se naya project select karein
4. Billing nahi chahiye — OAuth free hai

---

## Step 2: Google Auth Platform → Get Started

1. Is URL pe jayein (PROJECT_ID ko apne project se replace karein):
   ```
   https://console.cloud.google.com/auth/branding?project=YOUR_PROJECT_ID
   ```
   Ya top search bar me `OAuth` type karein → click karein

2. **"Google Auth Platform not configured yet"** dikhega → **[Get Started]** button click karein

3. Ab 4-step wizard khulega:

---

## Step 3: Wizard — App Information

**App name:** `ClinicAI`
**User support email:** apni email daalein

---

## Step 4: Wizard — Audience (IMPORTANT)

⚠ **External** select karo. Internal sirf Google Workspace org ke liye hai.

Agar External pick kiya to app "Testing" mode me start hogi — sirf test users sign-in kar sakte hain jab tak publish na karo.

---

## Step 5: Wizard — Contact Information

Developer email: wahi email daalo jo upar daali thi.

**[Create]** pe click karo.

---

## Step 6: Audience Tab → Test Users Add Karein

Ab left side me tabs dikhengi: **Branding | Audience | Data Access | Clients**

1. **Audience** tab pe jayein
2. Testing mode me hai to **"Test users"** section dikhega
3. **[Add Users]** click karein — apni email add karein (aur team members ki bhi)
4. Save karein

---

## Step 7: Data Access Tab → Scopes Add Karein

1. **Data Access** tab pe jayein
2. **[Add or Remove Scopes]** click karein
3. Ye scopes check karein:

   **Non-sensitive (basic identity):**
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

   **Sensitive (Calendar, Gmail, Drive, Contacts, Business):**
   - `.../auth/calendar.events`
   - `.../auth/calendar.readonly`
   - `.../auth/gmail.send`
   - `.../auth/drive.file`
   - `.../auth/contacts`
   - `.../auth/business.manage`

4. **[Update]** → **[Save]**

---

## Step 8: Clients Tab → OAuth Client ID Banayein

1. **Clients** tab pe jayein
2. **[Create Client]** click karein
3. Form fill karein:

   | Field | Value |
   |---|---|
   | Application type | **Web application** |
   | Name | `ClinicAI Web` |
   | Authorized JavaScript origins | _blank chorain_ |
   | Authorized redirect URIs | `http://localhost:8000/api/auth/callback/google` |
   | | `https://app.clinicai.pk/api/auth/callback/google` |

   ⚠ **Redirect URI exactly match hona chahiye.** Ek character bhi galat hua to `redirect_uri_mismatch` error aayega.

4. **[Create]**

---

## Step 9: Client ID + Secret Save Karein

Pop-up dialog me:

| Credential | Kya Karna Hai |
|---|---|
| **Client ID** | Copy karein → `.env` me `GOOGLE_CLIENT_ID` |
| **Client Secret** | Copy karein → `.env` me `GOOGLE_CLIENT_SECRET` |

⚠ **Dialog close karne ke baad Secret dobara nahi dikhega.** Turant save karo.
Ya **[Download JSON]** button se JSON file download karo, phir usme se copy karo.

---

## Step 10: APIs Enable Karein

Console search bar me type karo aur har API pe **ENABLE** karo:

| API | Search |
|---|---|
| Google Calendar API | `Calendar API` |
| Gmail API | `Gmail API` |
| Google Drive API | `Drive API` |
| People API | `People API` |

(Google My Business API optional hai — verification process lamba hai)

---

## Step 11: .env Variables Set Karein

```env
NEXTAUTH_URL=http://localhost:8000
NEXTAUTH_SECRET=<ye command se generate karo>
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxx
```

`NEXTAUTH_SECRET` generate:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 12: Test Karein

1. `npm run dev`
2. `http://localhost:8000/login` pe jayein
3. "Continue with Google" → sign in → dashboard

---

## Production Deploy (Coolify)

Jab production pe jana ho:

1. **Audience tab** → Testing → **Publish App** (ya "In Production" pe switch)
2. Coolify env vars me `NEXTAUTH_URL=https://app.clinicai.pk` set karo
3. Client ID + Secret wahi use hoga jo localhost ka — naye ki zaroorat nahi
4. Bas redirect URI me production URL pehle se add hai

---

## Common Errors & Fixes

| Error | Fix |
|---|---|
| `redirect_uri_mismatch` | Redirect URI exactly match nahi kar rahi. Port, protocol, trailing slash check karo |
| `access_blocked` / `Error 403` | App Testing mode me hai — Audience tab me apni email test users me add karo |
| `access_denied` | Scopes sensitive hain, verification complete nahi hui. Pehle sirf non-sensitive scopes se test karo |
| Secret lost | Clients tab → client pe click → "Add/Revoke Secret" |

---

## ClinicAI Me Features Enable Karna

Setup complete hone ke baad:

1. Google Sign-In complete karo
2. Dashboard → Settings me Google Connection status dikhega
3. Toggle karo: Calendar, Meet, Gmail, Drive, Contacts, Business Profile
4. Har feature ke liye Google incremental consent popup dikhayega
