/*
  Migration: add_clinic_working_hours
  Adds the clinic-wide default working hours JSON column.
  NOTE: this column was already applied to the live database via `prisma db execute`
  (ALTER TABLE "Clinic" ADD COLUMN "workingHours" TEXT NOT NULL DEFAULT '{}')
  because the database had pre-existing un-migrated schema drift and a full
  `migrate dev` reset was not an option. The statement below is idempotent.
*/

ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "workingHours" TEXT NOT NULL DEFAULT '{}';
