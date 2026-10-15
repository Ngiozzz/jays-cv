-- Search tags on jobs (each tag has its own page), and the AI's scam opinion on inbox posters
ALTER TABLE "Job" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "InboxItem" ADD COLUMN "scamRisk" TEXT,
ADD COLUMN "scamReason" TEXT;
