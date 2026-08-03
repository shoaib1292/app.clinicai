# ClinicAI — Prisma Schema Reference

Full path: `prisma/schema.prisma`  
Database: PostgreSQL 16  
Client: `@prisma/client`  
Schema lines: ~1,080

---

## Enums

| Enum | Values |
|------|--------|
| `AppointmentStatus` | `held`, `booked`, `confirmed`, `completed`, `cancelled`, `no_show`, `late_no_show`, `invalid` |
| `Gender` | `male`, `female`, `unknown` |
| `QueueMode` | `token`, `time`, `hybrid` |
| `SlotStatus` | `open`, `held`, `booked`, `blocked` |
| `PaymentProofStatus` | `pending`, `confirmed`, `rejected` |
| `PaymentMode` | `cash`, `online` |
| `PaymentProvider` | `jazzcash`, `easypaisa`, `bank_transfer` |
| `WhatsAppProvider` | `evolution`, `meta` |
| `ConversationStatus` | `active`, `resolved`, `archived` |
| `MessageDirection` | `inbound`, `outbound` |
| `MessageType` | `text`, `voice`, `image`, `template` |
| `CampaignStatus` | `draft`, `scheduled`, `running`, `completed`, `cancelled` |
| `CampaignChannel` | `whatsapp`, `sms` |
| `ReminderType` | `reminder_24h`, `reminder_2h`, `reminder_30min`, `feedback_1h` |
| `ReminderStatus` | `pending`, `sent`, `failed` |
| `LedgerType` | `debit`, `credit` |
| `AgentGender` | `male`, `female` |
| `AgentMode` | `single`, `multi` |
| `DoctorStatus` | `in_clinic`, `break`, `off`, `on_way` |
| `ScheduleOverrideType` | `block`, `emergency`, `leave` |

---

## Core Models

### Clinic (Tenant)

```prisma
model Clinic {
  id          String   @id @default(uuid())
  name        String
  city        String?
  whatsappPhone String?
  provider     WhatsAppProvider?
  instanceName String?
  agentName    String?    // AI assistant name (e.g., "Fatima")
  agentGender  AgentGender?
  agentMode    AgentMode? // single | multi
  agentEnabled Boolean?
  metaPhoneNumberId String?
  metaAccessToken    String?
  metaWabaId         String?
  trialEndsAt        DateTime?
  settlementScheduled Boolean?
  // ... + timestamps

  // Relations
  admins       ClinicAdmin[]
  doctors      Doctor[]
  receptionists Receptionist[]
  patients     Patient[]
  appointments Appointment[]
  conversations Conversation[]
  bankAccounts ClinicBankAccount[]
  whatsappConnection WhatsAppConnection?
  creditLedger CreditLedger[]
  invoices     Invoice[]
  pricingRules PricingRule[]
  // + more
}
```

### Doctor

```prisma
model Doctor {
  id            String   @id @default(uuid())
  clinicId      String
  name          String
  gender        Gender?
  email         String?
  speciality    String?
  slotDurationMin Int    @default(15)
  queueMode     QueueMode  @default(token)
  currentStatus DoctorStatus?
  workingHours  Json?   // [{ day, startTime, endTime }]

  clinic        Clinic   @relation(fields: [clinicId])
  slots         Slot[]
  appointments  Appointment[]
  services      Service[]
  schedules     Schedule[]
  scheduleOverrides ScheduleOverride[]
}
```

### Patient

```prisma
model Patient {
  id          String   @id @default(uuid())
  clinicId    String
  phoneHash   String   // SHA-256 hash of normalized phone
  phone       String?  // Encrypted at rest
  name        String?
  gender      Gender?
  totalVisits Int      @default(0)
  noShowCount Int      @default(0)

  clinic      Clinic   @relation(fields: [clinicId])
  appointments Appointment[]
  familyMembers PatientFamilyMember[]
  conversations Conversation[]
}
```

### Appointment

```prisma
model Appointment {
  id            String   @id @default(uuid())
  clinicId      String
  patientId     String
  doctorId      String
  slotId        String
  serviceId     String?
  start         DateTime
  end           DateTime
  status        AppointmentStatus
  channel       String    // whatsapp | manual | link
  createdVia    String    // agent | staff | public
  tokenNo       Int?
  totalFee      Decimal?
  paymentStatus String?   // paid | partial | unpaid
  paymentMode   PaymentMode?
  checkInTime   DateTime?
  notes         String?

  clinic        Clinic     @relation
  patient       Patient    @relation
  doctor        Doctor     @relation
  service       Service?   @relation
  slot          Slot       @relation
  fees          AppointmentFees?
  reminders     Reminder[]
  paymentProof  PaymentProof[]
  feedback      AppointmentFeedback?
}
```

### Slot

```prisma
model Slot {
  id          String   @id @default(uuid())
  doctorId    String
  clinicId    String
  date        DateTime
  startTime   String    // "09:30" (PKT local time, string)
  endTime     String    // "09:45" (PKT local time, string)
  durationMin Int       @default(15)
  tokenNo     Int?
  status      SlotStatus
  holdExpiresAt DateTime?

  doctor      Doctor    @relation
  appointment Appointment[]
}
```

### Conversation

```prisma
model Conversation {
  id          String   @id @default(uuid())
  clinicId    String
  patientId   String
  status      ConversationStatus
  takenOverBy String?   // receptionist ID who took over
  agentActive Boolean   @default(true)
  summary     String?

  clinic      Clinic    @relation
  patient     Patient   @relation
  messages    Message[]
}
```

### Message

```prisma
model Message {
  id             String   @id @default(uuid())
  conversationId String
  direction      MessageDirection
  type           MessageType
  body           String?
  voiceUrl       String?
  toolCalls      Json?     // Agent tool call history
  createdAt      DateTime

  conversation   Conversation @relation
}
```

### AppointmentFees

```prisma
model AppointmentFees {
  id              String   @id @default(uuid())
  appointmentId   String   @unique
  baseDoctorFee   Decimal?
  extraClinicFee  Decimal?
  platformFee     Decimal?
  total           Decimal?

  appointment     Appointment @relation
}
```

### CreditLedger

```prisma
model CreditLedger {
  id          String   @id @default(uuid())
  clinicId    String
  type        LedgerType
  amount      Decimal
  reason      String
  balanceAfter Decimal
  referenceId String?   // appointmentId or paymentProofId
  createdAt   DateTime

  clinic      Clinic   @relation
}
```

### Reminder

```prisma
model Reminder {
  id            String   @id @default(uuid())
  appointmentId String
  type          ReminderType
  sendAt        DateTime
  status        ReminderStatus
  sentAt        DateTime?

  appointment   Appointment @relation
}
```

### AutomationRule

```prisma
model AutomationRule {
  id            String   @id @default(uuid())
  clinicId      String
  name          String
  triggerEvent  String    // appointment.booked | appointment.cancelled | etc.
  conditions    Json?     // Recursive condition tree
  actionType    String    // send_template | transfer_to_human | webhook
  actionConfig  Json?     // Template name, webhook URL, etc.
  priority      Int?
  maxExecutions Int?
  enabled       Boolean

  clinic        Clinic   @relation
}
```

### WhatsAppConnection

```prisma
model WhatsAppConnection {
  id              String   @id @default(uuid())
  clinicId        String   @unique
  provider        WhatsAppProvider
  instanceName    String?
  phone           String?
  status          String?
  qrCode          String?
  connectedAt     DateTime?
  disconnectedAt  DateTime?
  metaPhoneNumberId String?
  metaAccessToken    String?
  metaWabaId         String?

  clinic          Clinic   @relation
}
```

---

## Supporting Models

- **PlatformAdmin** / **PlatformStaff** — B2B platform users with granular scopes
- **PlatformAppointment** — Platform staff appointments (sales, onboarding, support)
- **ClinicAdmin** / **Receptionist** — Clinic-level dashboard users
- **ClinicBankAccount** — Bank account details for settlement
- **PatientFamilyMember** — Non-registered family members for agent booking
- **PaymentProof** — Uploaded payment screenshots with VLM analysis
- **PaymentToken** — JazzCash/EasyPaisa payment tokens
- **PricingRule** — Platform fee rules per clinic or global
- **Invoice** — Generated invoices for platform fees
- **Schedule** — Weekly doctor availability (dayOfWeek, startTime, endTime, breaks)
- **ScheduleOverride** — Day-specific blocks/leaves/emergencies
- **Service** — Doctor services with duration and fees
- **AgentToggle** — Audit log of agent enable/disable events
- **LLMKey** — LLM API key management (provider, model, budget, priority)
- **LLMCallLog** — Per-call LLM usage tracking
- **AuditLog** — System-wide audit trail
- **AnalyticsSnapshot** — Pre-computed analytics data
- **AppointmentFeedback** — Post-appointment patient feedback
- **DeviceToken** — Expo push notification tokens
- **NotificationTemplate** — WhatsApp notification templates
- **QuickReplySnippet** — Staff quick reply snippets
- **Lead** — Landing page lead submissions
- **Campaign** / **CampaignMessage** — Broadcast campaign management
- **MetaTemplateCache** — Cached Meta template IDs
- **FilteredMessageLog** — Message delivery/failure tracking
