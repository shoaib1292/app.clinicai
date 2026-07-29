-- Add fraud-control fields to Clinic for the screenshot payment model.
-- These support the "fake screenshot -> penalty + pre-verify gate" flow:
--   - fakeProofCount: number of confirmed-fake payment proofs submitted
--   - requirePreVerify: when true, clinic_topup credits are HELD until platform confirms
--   - lastFakeAt: timestamp of the most recent confirmed-fake proof
ALTER TABLE "Clinic" ADD COLUMN "fakeProofCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Clinic" ADD COLUMN "requirePreVerify" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Clinic" ADD COLUMN "lastFakeAt" TIMESTAMP(3);
