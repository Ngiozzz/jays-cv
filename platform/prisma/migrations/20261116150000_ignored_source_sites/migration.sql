-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "ignoredSourceSites" TEXT[] DEFAULT ARRAY[]::TEXT[];
