-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "jobAdvert" TEXT,
ADD COLUMN     "jobId" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "needsJobAdvert" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Every business gets the "CV tailored to a job" service (placeholder price; the owner edits it
-- in Website content → Packages & prices). Skipped where one already exists.
INSERT INTO "Service" ("id", "tenantId", "name", "note", "price", "firstDraftHours", "revisionRounds", "needsJobAdvert", "visible", "sortOrder", "updatedAt")
SELECT gen_random_uuid()::text, t."id", 'CV tailored to a job', 'Your CV rewritten for one specific job advert', 1000, 48, 1, true, true,
       COALESCE((SELECT MAX(s."sortOrder") + 1 FROM "Service" s WHERE s."tenantId" = t."id"), 0), NOW()
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "Service" s WHERE s."tenantId" = t."id" AND (s."needsJobAdvert" OR s."name" = 'CV tailored to a job'));
