-- CreateEnum
CREATE TYPE "InboxState" AS ENUM ('READING', 'CHECK', 'APPROVED', 'DISCARDED');

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "state" "InboxState" NOT NULL DEFAULT 'READING',
    "posterPath" TEXT NOT NULL,
    "posterName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Uploaded',
    "rawText" TEXT NOT NULL DEFAULT '',
    "reading" JSONB,
    "unsure" TEXT[],
    "checked" TEXT[],
    "readError" TEXT,
    "discardReason" TEXT,
    "jobId" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "addedById" TEXT,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxItem_tenantId_state_createdAt_idx" ON "InboxItem"("tenantId", "state", "createdAt");

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
