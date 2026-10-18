-- Where a job is: counties from the fixed list of 47 (or "All counties" / "Outside Kenya" /
-- "Not specified"), an optional town or area, and the country for jobs abroad.
-- "location" stays as the text the site shows ("Tala, Machakos County"), worked out on save.
-- Existing jobs are sorted into counties by scripts/fill-counties.ts.
ALTER TABLE "Job" ADD COLUMN "counties" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "town" TEXT NOT NULL DEFAULT '',
ADD COLUMN "country" TEXT NOT NULL DEFAULT '';
