-- AlterTable
ALTER TABLE "InboxItem" ADD COLUMN     "advertPdfBytes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "advertPdfPath" TEXT;
