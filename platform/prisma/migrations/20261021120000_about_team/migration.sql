-- AlterTable
ALTER TABLE "AboutPage" ADD COLUMN     "ownerLinks" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "team" JSONB NOT NULL DEFAULT '[]';
