-- The owner can ask the platform owner for more AI tokens. Only adds things, so code deployed before it keeps working.

CREATE TYPE "TokenRequestStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

CREATE TABLE "TokenRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "note" TEXT,
    "status" "TokenRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TokenRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TokenRequest_tenantId_status_idx" ON "TokenRequest"("tenantId", "status");

ALTER TABLE "TokenRequest" ADD CONSTRAINT "TokenRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TokenRequest" ADD CONSTRAINT "TokenRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
