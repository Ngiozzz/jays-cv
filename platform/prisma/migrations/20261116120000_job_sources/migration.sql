-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "bannedJobSites" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "InboxItem" ADD COLUMN     "jobSourceId" TEXT,
ADD COLUMN     "pageUrl" TEXT,
ALTER COLUMN "posterPath" DROP NOT NULL;

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastAdded" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeenJobLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobSourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isJob" BOOLEAN NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeenJobLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobSource_tenantId_enabled_idx" ON "JobSource"("tenantId", "enabled");

-- CreateIndex
CREATE INDEX "SeenJobLink_tenantId_seenAt_idx" ON "SeenJobLink"("tenantId", "seenAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeenJobLink_jobSourceId_url_key" ON "SeenJobLink"("jobSourceId", "url");

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeenJobLink" ADD CONSTRAINT "SeenJobLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeenJobLink" ADD CONSTRAINT "SeenJobLink_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

