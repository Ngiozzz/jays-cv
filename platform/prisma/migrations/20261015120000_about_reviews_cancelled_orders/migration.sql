-- AlterEnum
ALTER TYPE "FileKind" ADD VALUE 'CHANGES';

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "deleteAbandonedDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "CancelledOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "trackingTokenHash" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancelledOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerRole" TEXT NOT NULL,
    "photo" TEXT,
    "story" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CancelledOrder_trackingTokenHash_key" ON "CancelledOrder"("trackingTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "CancelledOrder_tenantId_number_key" ON "CancelledOrder"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "AboutPage_tenantId_key" ON "AboutPage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");

-- AddForeignKey
ALTER TABLE "CancelledOrder" ADD CONSTRAINT "CancelledOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AboutPage" ADD CONSTRAINT "AboutPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

