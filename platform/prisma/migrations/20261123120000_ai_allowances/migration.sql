-- AI: per-person monthly allowances and an on/off switch, and whether a used-up allowance
-- carries on from the shared pool
ALTER TABLE "Membership" ADD COLUMN     "aiAllowance" INTEGER,
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "BusinessSettings" ADD COLUMN     "aiPoolFallback" BOOLEAN NOT NULL DEFAULT true;
