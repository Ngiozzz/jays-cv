-- AlterTable
ALTER TABLE "InboxItem" ADD COLUMN     "posterBytes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "posterType" TEXT NOT NULL DEFAULT 'image/jpeg';
