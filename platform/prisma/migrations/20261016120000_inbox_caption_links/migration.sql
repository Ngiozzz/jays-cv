-- AlterTable
ALTER TABLE "InboxItem" ADD COLUMN     "caption" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "links" JSONB,
ADD COLUMN     "splitFromId" TEXT;
