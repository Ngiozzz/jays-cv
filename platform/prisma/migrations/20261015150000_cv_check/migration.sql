-- CreateEnum
CREATE TYPE "CvCheckStatus" AS ENUM ('UNPAID', 'PAID', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "cvCheckPrice" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cvCheckId" TEXT;

-- CreateTable
CREATE TABLE "CvCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT,
    "jobLabel" TEXT NOT NULL,
    "jobSlug" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "CvCheckStatus" NOT NULL DEFAULT 'UNPAID',
    "cvPath" TEXT,
    "cvName" TEXT NOT NULL,
    "cvType" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "CvCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CvCheck_tenantId_createdAt_idx" ON "CvCheck"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "CvCheck" ADD CONSTRAINT "CvCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvCheck" ADD CONSTRAINT "CvCheck_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cvCheckId_fkey" FOREIGN KEY ("cvCheckId") REFERENCES "CvCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

