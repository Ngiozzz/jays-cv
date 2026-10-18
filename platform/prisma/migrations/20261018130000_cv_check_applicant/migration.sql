-- The name and email the AI read on the CV during a "Check it yourself", so ordering a tailored CV
-- afterwards starts with them filled in. The CV itself is now kept 48 hours after the check
-- (cvPath stays set until then) instead of being deleted straight away.
ALTER TABLE "CvCheck" ADD COLUMN "applicantName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "applicantEmail" TEXT NOT NULL DEFAULT '';
