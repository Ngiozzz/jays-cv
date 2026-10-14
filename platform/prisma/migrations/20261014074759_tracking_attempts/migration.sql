-- CreateTable
CREATE TABLE "TrackingAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackingAttempt_tenantId_key_at_idx" ON "TrackingAttempt"("tenantId", "key", "at");

-- AddForeignKey
ALTER TABLE "TrackingAttempt" ADD CONSTRAINT "TrackingAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
