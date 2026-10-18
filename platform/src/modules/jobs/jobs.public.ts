import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { fileStore } from "@/lib/storage";
import { logoUrl } from "./companies.service";
import * as repo from "./jobs.repo";
import { daysUntil, todayInNairobi } from "./jobs.rules";
import { applySchema, type ApplyDetails } from "./jobs.schema";

// The jobs board on the public website. Cached per business and refreshed whenever a job is saved
// (the admin calls updateTag(jobsTag(tenantId))), and at least hourly so closed jobs drop off on time.

export const jobsTag = (tenantId: string) => `jobs:${tenantId}`;

export type PublicJob = {
  slug: string;
  title: string;
  company: string;
  location: string;
  counties: string[];
  town: string;
  country: string;
  workMode: string;
  type: string;
  category: string;
  salary: string | null;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  tags: string[];
  deadline: string | null;
  postedDay: string;
  apply: ApplyDetails;
  source: string | null;
  posterUrl: string | null;
  logoUrl: string | null;
};

function toPublicJob({ files, deadline, postedAt, apply, companyRef, ...job }: repo.PublishedJobRow): PublicJob {
  return {
    ...job,
    deadline: deadline ? deadline.toISOString().slice(0, 10) : null,
    postedDay: todayInNairobi(postedAt),
    apply: applySchema.catch(applySchema.parse({})).parse(apply),
    posterUrl: files[0] ? fileStore.publicUrl("job-posters", files[0].storagePath) : null,
    logoUrl: logoUrl(companyRef?.logoPath ?? null),
  };
}

const isOpen = (job: PublicJob, today: string) => !job.deadline || daysUntil(job.deadline, today) >= 0;

function cacheJobs(tenantId: string) {
  cacheTag(jobsTag(tenantId));
  cacheLife("hours");
}

// Open jobs only, newest first, plus the day they were checked against (for "closes in 3 days")
export async function getJobBoard(tenantId: string): Promise<{ today: string; jobs: PublicJob[] }> {
  "use cache";
  cacheJobs(tenantId);
  const today = todayInNairobi();
  const jobs = (await repo.findPublishedJobs(tenantId)).map(toPublicJob).filter((job) => isOpen(job, today));
  return { today, jobs };
}

// One job, even after it closes, so old links still explain what happened
export async function getPublicJob(tenantId: string, slug: string): Promise<{ today: string; job: PublicJob | null }> {
  "use cache";
  cacheJobs(tenantId);
  const row = await repo.findPublishedJobBySlug(tenantId, slug);
  return { today: todayInNairobi(), job: row ? toPublicJob(row) : null };
}

export async function getPublishedJobSlugs(tenantId: string): Promise<string[]> {
  return (await repo.findPublishedJobs(tenantId)).map((job) => job.slug);
}
