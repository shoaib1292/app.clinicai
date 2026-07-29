-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('held', 'booked', 'confirmed', 'completed', 'cancelled', 'no_show', 'late_no_show', 'invalid');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'unknown');

-- CreateEnum
CREATE TYPE "QueueMode" AS ENUM ('token', 'time', 'hybrid');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('open', 'held', 'booked', 'blocked');

-- CreateEnum
CREATE TYPE "PaymentProofStatus" AS ENUM ('pending', 'confirmed', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentProofLedgerType" AS ENUM ('clinic_topup', 'patient_payment');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'audio', 'button', 'template', 'voice');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CreditLedgerType" AS ENUM ('debit', 'credit');

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "twoFactorSecret" TEXT,
    "twoFactorBackupCodes" TEXT,
    "twoFactorPendingSetup" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'super_admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformStaff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "twoFactorSecret" TEXT,
    "twoFactorBackupCodes" TEXT,
    "twoFactorPendingSetup" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAppointment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT,
    "adminId" TEXT,
    "clinicId" TEXT,
    "purpose" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "location" TEXT NOT NULL DEFAULT 'online',
    "meetLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "status" TEXT NOT NULL DEFAULT 'active',
    "city" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "metaConnected" BOOLEAN NOT NULL DEFAULT false,
    "evolutionConnected" BOOLEAN NOT NULL DEFAULT false,
    "evolutionInstance" TEXT,
    "metaPhoneId" TEXT,
    "metaWabaId" TEXT,
    "onlinePaymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "agentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "agentName" TEXT NOT NULL DEFAULT 'Sana',
    "agentGender" TEXT NOT NULL DEFAULT 'female',
    "agentTone" TEXT NOT NULL DEFAULT 'friendly',
    "agentLanguages" TEXT NOT NULL DEFAULT 'urdu,english,roman-urdu',
    "agentWelcome" TEXT NOT NULL DEFAULT 'Asalamualaikum! Main aap ki madad kar sakti hoon. Appointment lena hai?',
    "agentFallback" TEXT NOT NULL DEFAULT 'Mujhe is baare me maloom nahi, clinic se confirm karwa lein.',
    "agentPersona" TEXT NOT NULL DEFAULT '{}',
    "settlementMode" TEXT NOT NULL DEFAULT 'credit',
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicAdmin" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "twoFactorSecret" TEXT,
    "twoFactorBackupCodes" TEXT,
    "twoFactorPendingSetup" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClinicAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicBankAccount" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountTitle" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "iban" TEXT,
    "walletType" TEXT,
    "walletNumber" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "instructionsText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClinicBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'male',
    "speciality" TEXT NOT NULL,
    "qualifications" TEXT,
    "slotDurationMin" INTEGER NOT NULL DEFAULT 15,
    "queueMode" "QueueMode" NOT NULL DEFAULT 'hybrid',
    "currentStatus" TEXT NOT NULL DEFAULT 'off',
    "statusEta" INTEGER,
    "workingHours" TEXT NOT NULL DEFAULT '{}',
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "email" TEXT,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receptionist" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Receptionist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 15,
    "baseFee" INTEGER NOT NULL DEFAULT 0,
    "extraClinicFee" INTEGER NOT NULL DEFAULT 0,
    "doctorId" TEXT,
    "description" TEXT,
    "isSurgery" BOOLEAN NOT NULL DEFAULT false,
    "requiredResources" TEXT DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakWindows" TEXT NOT NULL DEFAULT '[]',
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleOverride" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 15,
    "tokenNo" INTEGER,
    "status" "SlotStatus" NOT NULL DEFAULT 'open',
    "holdExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "phoneLast4" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'unknown',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'urdu',
    "preferredModality" TEXT NOT NULL DEFAULT 'auto',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "optInMarketing" BOOLEAN NOT NULL DEFAULT false,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "invalidBookingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientFamilyMember" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'unknown',
    "relation" TEXT NOT NULL,
    "notes" TEXT,
    "ownPatientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PatientFamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "doctorId" TEXT NOT NULL,
    "slotId" TEXT,
    "serviceId" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'booked',
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "doctorFee" INTEGER NOT NULL DEFAULT 0,
    "extraClinicFee" INTEGER NOT NULL DEFAULT 0,
    "platformFee" INTEGER NOT NULL DEFAULT 50,
    "totalFee" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "createdByStaffId" TEXT,
    "createdVia" TEXT NOT NULL DEFAULT 'agent',
    "metaMsgId" TEXT,
    "checkInTime" TIMESTAMP(3),
    "notes" TEXT,
    "type" TEXT NOT NULL DEFAULT 'consultation',
    "operationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentFees" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "baseDoctorFee" INTEGER NOT NULL,
    "extraClinicFee" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "platformFeeOverride" INTEGER,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AppointmentFees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'evo',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastIntent" TEXT,
    "summary" TEXT,
    "agentPersonaSnapshot" TEXT NOT NULL DEFAULT '{}',
    "takenOverBy" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL,
    "transcript" TEXT,
    "providerMsgId" TEXT,
    "agentGenderUsed" TEXT,
    "agentLanguageUsed" TEXT,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMKey" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "dailyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "ttsModel" TEXT NOT NULL DEFAULT 'tongtong',
    "sttModel" TEXT NOT NULL DEFAULT 'whisper-1',
    "lastError" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "addedById" TEXT,

    CONSTRAINT "LLMKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMCallLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "keyId" TEXT,
    "model" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "intent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LLMCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "ledgerType" "PaymentProofLedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerPhone" TEXT,
    "screenshotUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" "PaymentProofStatus" NOT NULL DEFAULT 'pending',
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentToken" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "provider" TEXT NOT NULL DEFAULT 'jazzcash',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "providerRef" TEXT,
    "paidAmount" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" "CreditLedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "appointmentId" TEXT,
    "paymentProofId" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "platformFeeTotal" INTEGER NOT NULL DEFAULT 0,
    "extraClinicFeeTotal" INTEGER NOT NULL DEFAULT 0,
    "metaCostTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "platformFeeDefault" INTEGER NOT NULL DEFAULT 50,
    "platformFeeOverride" INTEGER,
    "extraClinicFeeMin" INTEGER NOT NULL DEFAULT 0,
    "extraClinicFeeMax" INTEGER NOT NULL DEFAULT 500,
    "billingMode" TEXT NOT NULL DEFAULT 'credit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToggle" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pausedReason" TEXT,
    "pausedBy" TEXT,
    "pausedUntil" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AgentToggle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "metaPhoneId" TEXT,
    "metaTokenEnc" TEXT,
    "evoInstanceName" TEXT,
    "filterGroups" BOOLEAN NOT NULL DEFAULT true,
    "filterStatus" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaTemplateCache" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "wabaId" TEXT,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ur',
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "headerType" TEXT,
    "headerValue" TEXT,
    "footerText" TEXT,
    "buttons" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MetaTemplateCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "triggerEvent" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'urdu',
    "modality" TEXT NOT NULL DEFAULT 'text',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "clinicName" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "monthlyAppointments" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "claimedByStaffId" TEXT,
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "clinicId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "platformAdminId" TEXT,
    "platformStaffId" TEXT,
    "clinicAdminId" TEXT,
    "receptionistId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilteredMessageLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "reason" TEXT NOT NULL,
    "raw" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FilteredMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentFeedback" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "waitTimeMins" INTEGER,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "comment" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AppointmentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditions" TEXT NOT NULL DEFAULT '{}',
    "actionType" TEXT NOT NULL,
    "actionConfig" TEXT NOT NULL DEFAULT '{}',
    "triggerEvent" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxExecutions" INTEGER NOT NULL DEFAULT 1,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "templateName" TEXT,
    "templateBody" TEXT,
    "language" TEXT NOT NULL DEFAULT 'urdu',
    "modality" TEXT NOT NULL DEFAULT 'text',
    "scheduleType" TEXT NOT NULL DEFAULT 'immediate',
    "scheduledAt" TIMESTAMP(3),
    "recurring" TEXT,
    "filter" TEXT NOT NULL DEFAULT '{}',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "phone" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CampaignMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "clinicId" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'unknown',
    "deviceName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickReplySnippet" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "sortIdx" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "QuickReplySnippet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformStaff_email_key" ON "PlatformStaff"("email");

-- CreateIndex
CREATE INDEX "PlatformAppointment_staffId_start_idx" ON "PlatformAppointment"("staffId", "start");

-- CreateIndex
CREATE INDEX "PlatformAppointment_clinicId_start_idx" ON "PlatformAppointment"("clinicId", "start");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_slug_key" ON "Clinic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicAdmin_email_key" ON "ClinicAdmin"("email");

-- CreateIndex
CREATE INDEX "ClinicBankAccount_clinicId_isDefault_idx" ON "ClinicBankAccount"("clinicId", "isDefault");

-- CreateIndex
CREATE INDEX "Doctor_clinicId_active_idx" ON "Doctor"("clinicId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Receptionist_email_key" ON "Receptionist"("email");

-- CreateIndex
CREATE INDEX "Service_clinicId_doctorId_idx" ON "Service"("clinicId", "doctorId");

-- CreateIndex
CREATE INDEX "Service_clinicId_active_idx" ON "Service"("clinicId", "active");

-- CreateIndex
CREATE INDEX "Schedule_doctorId_dayOfWeek_idx" ON "Schedule"("doctorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ScheduleOverride_doctorId_date_idx" ON "ScheduleOverride"("doctorId", "date");

-- CreateIndex
CREATE INDEX "Slot_clinicId_doctorId_date_status_idx" ON "Slot"("clinicId", "doctorId", "date", "status");

-- CreateIndex
CREATE INDEX "Slot_clinicId_date_idx" ON "Slot"("clinicId", "date");

-- CreateIndex
CREATE INDEX "Patient_clinicId_phoneLast4_idx" ON "Patient"("clinicId", "phoneLast4");

-- CreateIndex
CREATE INDEX "Patient_clinicId_name_idx" ON "Patient"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_clinicId_phoneHash_key" ON "Patient"("clinicId", "phoneHash");

-- CreateIndex
CREATE INDEX "PatientFamilyMember_patientId_name_idx" ON "PatientFamilyMember"("patientId", "name");

-- CreateIndex
CREATE INDEX "PatientFamilyMember_clinicId_relation_idx" ON "PatientFamilyMember"("clinicId", "relation");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_slotId_key" ON "Appointment"("slotId");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_status_start_idx" ON "Appointment"("clinicId", "status", "start");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_patientId_idx" ON "Appointment"("clinicId", "patientId");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_doctorId_start_idx" ON "Appointment"("clinicId", "doctorId", "start");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_createdByStaffId_idx" ON "Appointment"("clinicId", "createdByStaffId");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_start_idx" ON "Appointment"("clinicId", "start");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_paymentStatus_idx" ON "Appointment"("clinicId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentFees_appointmentId_key" ON "AppointmentFees"("appointmentId");

-- CreateIndex
CREATE INDEX "Conversation_clinicId_patientId_status_idx" ON "Conversation"("clinicId", "patientId", "status");

-- CreateIndex
CREATE INDEX "Conversation_clinicId_status_idx" ON "Conversation"("clinicId", "status");

-- CreateIndex
CREATE INDEX "Message_conversationId_ts_idx" ON "Message"("conversationId", "ts");

-- CreateIndex
CREATE INDEX "LLMCallLog_clinicId_createdAt_idx" ON "LLMCallLog"("clinicId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProof_appointmentId_key" ON "PaymentProof"("appointmentId");

-- CreateIndex
CREATE INDEX "PaymentProof_clinicId_status_ledgerType_idx" ON "PaymentProof"("clinicId", "status", "ledgerType");

-- CreateIndex
CREATE INDEX "PaymentProof_clinicId_status_createdAt_idx" ON "PaymentProof"("clinicId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentToken_appointmentId_key" ON "PaymentToken"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentToken_token_key" ON "PaymentToken"("token");

-- CreateIndex
CREATE INDEX "PaymentToken_token_idx" ON "PaymentToken"("token");

-- CreateIndex
CREATE INDEX "PaymentToken_clinicId_status_idx" ON "PaymentToken"("clinicId", "status");

-- CreateIndex
CREATE INDEX "PaymentToken_appointmentId_idx" ON "PaymentToken"("appointmentId");

-- CreateIndex
CREATE INDEX "CreditLedger_clinicId_createdAt_idx" ON "CreditLedger"("clinicId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CreditLedger_clinicId_type_createdAt_idx" ON "CreditLedger"("clinicId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Invoice_clinicId_status_periodStart_idx" ON "Invoice"("clinicId", "status", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AgentToggle_clinicId_key" ON "AgentToggle"("clinicId");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_clinicId_status_idx" ON "WhatsAppConnection"("clinicId", "status");

-- CreateIndex
CREATE INDEX "MetaTemplateCache_clinicId_status_idx" ON "MetaTemplateCache"("clinicId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MetaTemplateCache_clinicId_name_language_key" ON "MetaTemplateCache"("clinicId", "name", "language");

-- CreateIndex
CREATE INDEX "Reminder_appointmentId_type_idx" ON "Reminder"("appointmentId", "type");

-- CreateIndex
CREATE INDEX "Reminder_sendAt_status_idx" ON "Reminder"("sendAt", "status");

-- CreateIndex
CREATE INDEX "Lead_status_claimedByStaffId_idx" ON "Lead"("status", "claimedByStaffId");

-- CreateIndex
CREATE INDEX "Lead_clinicId_createdAt_idx" ON "Lead"("clinicId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_ts_idx" ON "AuditLog"("clinicId", "ts" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_action_ts_idx" ON "AuditLog"("clinicId", "action", "ts" DESC);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_clinicId_date_idx" ON "AnalyticsSnapshot"("clinicId", "date");

-- CreateIndex
CREATE INDEX "FilteredMessageLog_clinicId_ts_idx" ON "FilteredMessageLog"("clinicId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentFeedback_appointmentId_key" ON "AppointmentFeedback"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentFeedback_clinicId_doctorId_rating_idx" ON "AppointmentFeedback"("clinicId", "doctorId", "rating");

-- CreateIndex
CREATE INDEX "AppointmentFeedback_clinicId_createdAt_idx" ON "AppointmentFeedback"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentFeedback_patientId_idx" ON "AppointmentFeedback"("patientId");

-- CreateIndex
CREATE INDEX "AutomationRule_clinicId_triggerEvent_enabled_idx" ON "AutomationRule"("clinicId", "triggerEvent", "enabled");

-- CreateIndex
CREATE INDEX "Campaign_clinicId_status_scheduledAt_idx" ON "Campaign"("clinicId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "CampaignMessage_campaignId_status_idx" ON "CampaignMessage"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignMessage_clinicId_status_idx" ON "CampaignMessage"("clinicId", "status");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_active_idx" ON "DeviceToken"("userId", "active");

-- CreateIndex
CREATE INDEX "DeviceToken_clinicId_active_idx" ON "DeviceToken"("clinicId", "active");

-- CreateIndex
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_userId_key" ON "DeviceToken"("token", "userId");

-- CreateIndex
CREATE INDEX "QuickReplySnippet_clinicId_enabled_sortIdx_idx" ON "QuickReplySnippet"("clinicId", "enabled", "sortIdx");

-- AddForeignKey
ALTER TABLE "PlatformAppointment" ADD CONSTRAINT "PlatformAppointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "PlatformStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAppointment" ADD CONSTRAINT "PlatformAppointment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAppointment" ADD CONSTRAINT "PlatformAppointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicAdmin" ADD CONSTRAINT "ClinicAdmin_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicBankAccount" ADD CONSTRAINT "ClinicBankAccount_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receptionist" ADD CONSTRAINT "Receptionist_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleOverride" ADD CONSTRAINT "ScheduleOverride_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientFamilyMember" ADD CONSTRAINT "PatientFamilyMember_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentFees" ADD CONSTRAINT "AppointmentFees_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMKey" ADD CONSTRAINT "LLMKey_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMCallLog" ADD CONSTRAINT "LLMCallLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMCallLog" ADD CONSTRAINT "LLMCallLog_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "LLMKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentToken" ADD CONSTRAINT "PaymentToken_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentToken" ADD CONSTRAINT "PaymentToken_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_paymentProofId_fkey" FOREIGN KEY ("paymentProofId") REFERENCES "PaymentProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToggle" ADD CONSTRAINT "AgentToggle_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaTemplateCache" ADD CONSTRAINT "MetaTemplateCache_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_claimedByStaffId_fkey" FOREIGN KEY ("claimedByStaffId") REFERENCES "PlatformStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_platformStaffId_fkey" FOREIGN KEY ("platformStaffId") REFERENCES "PlatformStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicAdminId_fkey" FOREIGN KEY ("clinicAdminId") REFERENCES "ClinicAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_receptionistId_fkey" FOREIGN KEY ("receptionistId") REFERENCES "Receptionist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentFeedback" ADD CONSTRAINT "AppointmentFeedback_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentFeedback" ADD CONSTRAINT "AppointmentFeedback_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentFeedback" ADD CONSTRAINT "AppointmentFeedback_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentFeedback" ADD CONSTRAINT "AppointmentFeedback_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickReplySnippet" ADD CONSTRAINT "QuickReplySnippet_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

