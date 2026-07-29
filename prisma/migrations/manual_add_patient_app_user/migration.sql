-- Migration: add_patient_app_user
-- Created: 2026-07-20

-- Add appUserId column to Patient (optional FK to PatientAppUser)
ALTER TABLE "Patient" ADD COLUMN "appUserId" TEXT;

-- Create PatientAppUser table
CREATE TABLE "PatientAppUser" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAppUser_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "PatientAppUser_phone_key" ON "PatientAppUser"("phone");
CREATE UNIQUE INDEX "PatientAppUser_phoneHash_key" ON "PatientAppUser"("phoneHash");

-- Add foreign key from Patient.appUserId -> PatientAppUser.id
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "PatientAppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
