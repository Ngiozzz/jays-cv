-- The writer's AI helper results on an order, and the AI's screening of client reviews
-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "aiFlag" TEXT,
ADD COLUMN     "aiReason" TEXT;

-- CreateTable
CREATE TABLE "OrderAiResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAiResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAiResult_tenantId_orderId_kind_createdAt_idx" ON "OrderAiResult"("tenantId", "orderId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderAiResult" ADD CONSTRAINT "OrderAiResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAiResult" ADD CONSTRAINT "OrderAiResult_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAiResult" ADD CONSTRAINT "OrderAiResult_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

