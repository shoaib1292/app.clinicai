-- AlterTable
-- Adds the website block configuration column to the Clinic table.
-- JSON shape: [{ blockId, order, visible, content, visual }]
-- Uses IF NOT EXISTS so this is safe on databases where the column was
-- already added out-of-band (e.g. via db push) before this migration existed.
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "blocksConfig" TEXT;
