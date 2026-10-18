-- The pipe to the platform owner's Command Center. Only adds things, so code deployed before it keeps working.

-- The owner can pause a business's AI from the Command Center
ALTER TABLE "BusinessSettings" ADD COLUMN "aiPaused" BOOLEAN NOT NULL DEFAULT false;

-- Each business's secret for signing Command Center messages (set by scripts/command-center-key.ts)
ALTER TABLE "Tenant" ADD COLUMN "commandCenterKey" TEXT;

-- A running number on every token entry. Existing entries are numbered oldest first, then new ones
-- continue from the sequence (the same sequence a SERIAL column would have).
ALTER TABLE "TokenLedgerEntry" ADD COLUMN "seq" INTEGER;
CREATE SEQUENCE "TokenLedgerEntry_seq_seq" AS INTEGER OWNED BY "TokenLedgerEntry"."seq";
UPDATE "TokenLedgerEntry" AS e
SET "seq" = numbered.n
FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS n FROM "TokenLedgerEntry") AS numbered
WHERE e."id" = numbered."id";
SELECT setval('"TokenLedgerEntry_seq_seq"', COALESCE((SELECT MAX("seq") FROM "TokenLedgerEntry"), 0) + 1, false);
ALTER TABLE "TokenLedgerEntry" ALTER COLUMN "seq" SET DEFAULT nextval('"TokenLedgerEntry_seq_seq"');
ALTER TABLE "TokenLedgerEntry" ALTER COLUMN "seq" SET NOT NULL;

-- Commands received from the Command Center; the id is the Command Center's, so a retry is only carried out once
CREATE TABLE "CcCommand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CcCommand_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CcCommand_tenantId_receivedAt_idx" ON "CcCommand"("tenantId", "receivedAt");
CREATE UNIQUE INDEX "TokenLedgerEntry_seq_key" ON "TokenLedgerEntry"("seq");
CREATE INDEX "TokenLedgerEntry_tenantId_seq_idx" ON "TokenLedgerEntry"("tenantId", "seq");

ALTER TABLE "CcCommand" ADD CONSTRAINT "CcCommand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
