-- Fee Model Redesign v2
-- Transform live DB to match prisma/schema.prisma:
--   * Clinic.combineFees (new setting)
--   * Service.extraClinicFee dropped
--   * Appointment/AppointmentFees: extraClinicFee -> clinicMarkup
--   * PricingRule: extraClinicFeeMin/Max -> markupMin/Max + add markupDefault
--   * Invoice.extraClinicFeeTotal -> clinicMarkupTotal
-- Idempotent; safe to re-run. Follows the repo's `prisma db execute` convention
-- (no migration record, matching the add_clinic_working_hours pattern).

ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "combineFees" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Service" DROP COLUMN IF EXISTS "extraClinicFee";

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "clinicMarkup" INT NOT NULL DEFAULT 0;
UPDATE "Appointment" SET "clinicMarkup" = COALESCE("extraClinicFee", 0);
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "extraClinicFee";

ALTER TABLE "AppointmentFees" ADD COLUMN IF NOT EXISTS "clinicMarkup" INT NOT NULL DEFAULT 0;
UPDATE "AppointmentFees" SET "clinicMarkup" = COALESCE("extraClinicFee", 0);
ALTER TABLE "AppointmentFees" DROP COLUMN IF EXISTS "extraClinicFee";

ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "markupMin" INT NOT NULL DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "markupMax" INT NOT NULL DEFAULT 500;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "markupDefault" INT NOT NULL DEFAULT 0;
UPDATE "PricingRule"
  SET "markupMin" = COALESCE("extraClinicFeeMin", 0),
      "markupMax" = COALESCE("extraClinicFeeMax", 500);
ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "extraClinicFeeMin";
ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "extraClinicFeeMax";

ALTER TABLE "Invoice" RENAME COLUMN "extraClinicFeeTotal" TO "clinicMarkupTotal";
