-- AlterTable
ALTER TABLE "InboxItem" ADD COLUMN     "aiCheck" TEXT,
ADD COLUMN     "aiCheckReason" TEXT,
ADD COLUMN     "aiCheckedAt" TIMESTAMP(3);
