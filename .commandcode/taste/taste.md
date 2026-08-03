# ui
See [ui/taste.md](ui/taste.md)
# auth
- 2FA must be optional: only enforce 2FA during login if the user has already enabled it in their settings; never block login for users who haven't set up 2FA. Confidence: 0.85

# product-vision
- ClinicAI is fundamentally a patient acquisition system — the core goal is enabling every clinic to maximize their patient appointment bookings. Feature prioritization should serve this goal: increasing patient volume and making booking frictionless. Confidence: 0.80
- V1 of any feature must be simple and opinionated — pickers, toggles, and predefined options over drag-and-drop builders, WYSIWYG editors, or complex configuration UIs. Ship the simple version first; complex customization can come later when actually needed. Confidence: 0.80
- The WhatsApp AI receptionist is the top-of-funnel acquisition channel (audience attraction), while the patient portal and mobile app are the destination platforms where patients get a rich, full-featured experience. The strategic funnel is: WhatsApp attracts → Portal/App retains with rich features. Confidence: 0.80
- New doctor-facing consultation capabilities should be per-doctor opt-in toggles (e.g., `canTelemedicine` + optional fee), not auto-enabled for all doctors — a clean opt-in model gives clinics control and avoids making new features an adoption barrier. Confidence: 0.6

# pricing
See [pricing/taste.md](pricing/taste.md)
# onboarding
- Replace trial flow with immediate clinic admin self-signup, prompt to book onboarding meeting, and grant 1000 PKR free credits on signup. Confidence: 0.75

# mobile
- Target the Expo SDK version that matches Expo Go on the user's phone — not a fixed old version. The user tests on-device via Expo Go, so the SDK must match what's installed there. As of latest: SDK 57.x (57.0.2+). Confidence: 0.90

# error-messaging
- Always show proper, user-friendly error messages to users when any external API call fails (Daily.co, Evolution API, Brevo, AssemblyAI, etc.); never expose raw technical error strings like "no available server", "ECONNREFUSED", "fetch failed", or bare HTTP status codes. Translate them into clear, actionable messages in the user's language. Confidence: 0.85

# whatsapp-integration
- Use real Evolution API credentials for WhatsApp QR connection; never use sandbox/mock/fake QR codes. Confidence: 0.80
- Support both Evolution API (QR-based) and Meta Cloud API as WhatsApp connection methods so clinics can choose. Confidence: 0.75
- Use app.clinicai.pk as the webhook domain for Evolution/Meta webhooks. Confidence: 0.85
- In clinic-facing UI, use neutral labels (e.g., "QR Code", "Phone Number Pairing", "WhatsApp Link") instead of "Evolution API" to avoid exposing the internal tech stack. Make Meta Cloud API the default/recommended tab. Differentiate the methods factually: QR/pairing only enables basic message replies, while Meta Cloud API enables automation, campaigns, and full features. Keep ban risk messaging factual and measured — don't use alarmist/scary language that deters users from connecting at all. Confidence: 0.85

# mobile-dev
- When building mobile app forms, cross-reference every field against the corresponding web app form AND the backend API schema before claiming completion. Missing fields (slotDurationMin, queueMode, workingHours for doctors) break functionality. Confidence: 0.75
- Pin react and react-dom to exact version (no caret ^) in Expo SDK 56 projects — the bundled react-native-renderer requires an exact match, and ^19.2.3 resolves to 19.2.8 causing runtime crashes. Confidence: 0.70
- When scaffolding a new sibling project (e.g., patient app alongside staff app), first audit existing sibling projects for reusable infrastructure — design system constants, theme providers, hooks, utilities, UI components, and assets. Copy these directly rather than rebuilding from scratch. Confidence: 0.75
- Pin dependency versions in new sibling projects to match existing sibling projects (same Expo SDK, React, React Native, TypeScript versions) rather than using latest or default versions from the scaffolder. Confidence: 0.70
- Use `npm install --legacy-peer-deps` (not plain `npm install`) for Expo projects — peer dependency mismatches are endemic in the Expo ecosystem and strict peer dep resolution causes install failures. Confidence: 0.65

# i18n
- Keep all UI in English for both mobile and web apps; only the WhatsApp AI agent should use Urdu. Do not add Urdu translations, localization, or language conversion to any app interfaces. Confidence: 0.85

# branding
- Keep the brand color as black/neutral monochrome. Do not introduce chromatic brand accents (teal, blue, purple, etc.) — the black monochrome palette IS the intentional brand identity. Confidence: 0.85
- When CSS design tokens undergo a brand migration (e.g., cyan → monochrome), update the CSS variable definitions and utility class implementations (`.glass-card`, `.hover-glow`, `.gradient-border`) rather than hunting down every class usage across dozens of files — the cascade handles propagation. Keep the class names stable; change their underlying styles. Confidence: 0.70

# email-infrastructure
- Use Stalwart mail server (open-source, Rust-based) as the self-hosted mail server for ClinicAI, replacing docker-mailserver; Stalwart fits better on the shared Coolify VPS since it doesn't conflict with Traefik on ports 80/443. Confidence: 0.75
- Only adopt paid/paid-tier infrastructure services (like a second VPS for Mailcow) if free open-source alternatives like Stalwart have been verified as unsuitable for the use case. Confidence: 0.65
- Brevo ke do alag key types hain: SMTP key (xsmtpsib-... prefix) sirf SMTP relay ke liye, aur API key (xkeysib-... prefix) REST API ke liye. SMTP key ko REST API me use nahi kar sakte aur API key ko SMTP auth me nahi — dono completely separate hain. Jab SMTP IP block ho jaye to REST API (`POST /v3/smtp/email` with `api-key` header) use karo. Confidence: 0.85
- Brevo me IP whitelisting dono SMTP aur REST API dono ko affect karti hai — agar "Unauthorized IP" ya "unrecognised IP" error aaye to user ko Brevo Dashboard → Security → Authorised IPs (https://app.brevo.com/security/authorised_ips) me apna current IP add karna hoga. Confidence: 0.75

# coolify-workflow
- Name the Coolify MCP server "coolify" (not "karo") when registering it via `cmdc mcp add`. Confidence: 0.65
- When working with Coolify-deployed services, log in directly via the Coolify web UI whenever credentials are available rather than asking the user to run terminal commands. Confidence: 0.65
- For Coolify-deployed Docker Compose services, do not rely on host port publishing — use Traefik domain routing (add a domain via Proxy/Domains in the service UI) instead. Compose-pasted services often fail to publish ports to the host cleanly. Confidence: 0.70
- The standard deployment pipeline is: push clean code to GitHub → Coolify auto-deploys from Git repo (Dockerfile-based app). Prefer Coolify-managed databases (PostgreSQL, Redis) over self-managed Docker containers for ease of management. Confidence: 0.85

# cli
- When providing terminal commands to the user, keep commands short and avoid long paths that may wrap/garble in their terminal; use shell variables to shorten long paths. Confidence: 0.80

# email-templates
- Use professionally designed, branded HTML email templates with ClinicAI logo, properly styled buttons, and clear ClinicAI sender identity — not plain/low-effort emails. Confidence: 0.65
- Ensure ClinicAI logo in email templates has constrained dimensions (small, e.g. 36-48px) and renders correctly across email clients — oversized logos break the email layout. Confidence: 0.70

# communication
See [communication/taste.md](communication/taste.md)
# mobile-dev
- OTP delivery must use WhatsApp, not SMS (SMS costs are too high). Confidence: 0.75
- Always apply proper rate limiting to OTP/auth endpoints. Confidence: 0.75
- The patient-facing app must be a completely separate Expo project from the clinic staff app — do NOT add patient screens inside the existing clinicai-mobile app. Confidence: 0.80

# project-structure
- When creating new sibling projects (e.g., clinicai-patient), place them in `C:\Users\Thinkpad\Downloads/<project-name>/` rather than inside the main ClinicAi repo directory. The user accesses and tests mobile projects from their Downloads folder. Confidence: 0.70
- The project has two separate Next.js apps — main dashboard (`src/`) and landing page (`clinicai-landing/`). When making cross-cutting UI changes (global pages like 404, shared components, error pages), apply them to BOTH apps, not just one. The user expects consistency across both apps. Confidence: 0.70
- Navigation destinations (e.g., "Back to Home" on 404 pages, error recovery links) must respect the user's current app context: on the dashboard app (`app.clinicai.pk`), link back to `/login` or dashboard home — never cross-redirect to the landing page (`clinicai.pk`). Users may already be logged in and working; pulling them out of the app disrupts their flow. Confidence: 0.85
- The main dashboard app (`src/`, deployed to `app.clinicai.pk`) and the landing page (`clinicai-landing/`, deployed to `clinicai.pk`) should live in separate Git repositories — not just separate folders in a monorepo. This keeps pushes, deployments, and CI independent; issues in one (build cache bloat, large files, dependency conflicts) should not block the other. Confidence: 0.80

- When adding real pages that replace footer placeholder links (`href="#"`), also remove any remaining dead links that have no corresponding page — don't leave `#` stubs behind. Confidence: 0.70

# code-style
See [code-style/taste.md](code-style/taste.md)
# architecture
See [architecture/taste.md](architecture/taste.md)
# dev-config
- localhost:3000 serves clinicai.pk and localhost:8000 serves app.clinicai.pk, both accessed via tunnel. All three services (next, realtime, worker) must run together via `npm run dev`. Confidence: 0.85
- Provide a working `dev.ps1` PowerShell script as the primary way to start all project services on Windows; the user prefers `.\dev.ps1` for quick startup. Confidence: 0.65
- Use PowerShell (Invoke-WebRequest, Get-Content) for runtime debugging on Windows — reading .env files, testing external API connectivity, and inspecting runtime state of services. Confidence: 0.75
. Confidence: 0.75
- When adding a new environment variable to `.env`, always also add it to `.env.example` with a placeholder value (not the real secret), so other developers and deployers can discover it. Confidence: 0.80

# workflow
- Before starting development on a new project, install relevant skills via `npx -y skills add <repo> --skill <skill-name> --agent claude-code` as a prerequisite step. The user expects skill setup before coding begins. When a requested skill name doesn't exist in the repo, find the closest equivalent. Confidence: 0.70
See [workflow/taste.md](workflow/taste.md)
# whatsapp-safety
See [whatsapp-safety/taste.md](whatsapp-safety/taste.md)
# phone-input
- Use `+92` (Pakistan) as the default country code prefix for all phone/WhatsApp number inputs across forms (signup, patient booking, doctor/receptionist profiles), except for the clinic's landline/calling phone number field. Confidence: 0.75
- For the clinic admin profile/settings page, provide two separate fields: a WhatsApp number field (with +92 prefix) and a separate calling/landline phone number field (no forced country code). Confidence: 0.75
- The public booking link should only collect the PATIENT's WhatsApp number; do NOT add doctor or receptionist WhatsApp number fields to the public booking flow. Confidence: 0.80

# stt-provider
- Soniox is the preferred STT provider for ClinicAI: cheapest ($0.12/hr), native Hinglish/code-switching support, and real-time transcription (sub-200ms). Confidence: 0.85
- When evaluating STT providers, prioritize: Pakistani language support (Urdu, Punjabi, Pashto, Sindhi) > cost > real-time capability > Hinglish/mixed-language support. Confidence: 0.80
- Assembly AI is already integrated and should be kept as a free-tier STT fallback alongside Soniox; use it when Soniox is unavailable or for Urdu-only cases where cost matters (Assembly AI gives free credits). Confidence: 0.85
- Soniox is the primary STT provider; Whisper (OpenAI) serves as fallback for Pashto/Sindhi which Soniox does not support. Confidence: 0.85
- Prefer managing STT provider configuration through the Platform Admin → LLM Keys UI (same pattern as LLM key management), not environment variables. Confidence: 0.80
