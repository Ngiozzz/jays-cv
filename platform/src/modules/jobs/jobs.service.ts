import "server-only";
import type { Job } from "@/generated/prisma/client";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import * as repo from "./jobs.repo";
import { removePoster } from "./poster.service";
import { displayStatus, slugify, todayInNairobi, uniqueSlug, type JobDisplayStatus } from "./jobs.rules";
import { applySchema, jobDraftSchema, publishProblems, type JobInput } from "./jobs.schema";

// Every function checks the "post jobs" permission itself: the screens hiding buttons is not enough

export type SaveIntent = "draft" | "publish";
export type FieldErrors = Record<string, string>;
export type SaveResult = { ok: true; id: string; published: boolean } | { ok: false; fieldErrors: FieldErrors };

const isoDay = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

export type JobRow = Omit<repo.JobListRow, "deadline" | "postedAt"> & {
  deadline: string | null;
  postedDay: string;
  shownAs: JobDisplayStatus;
};

export async function listJobs(member: CurrentMember): Promise<JobRow[]> {
  assertCan(member, "postJobs");
  const today = todayInNairobi();
  const rows = await repo.findJobsForList(member.tenant.id);
  return rows.map(({ deadline, postedAt, ...row }) => {
    const job = { ...row, deadline: isoDay(deadline), postedDay: todayInNairobi(postedAt) };
    return { ...job, shownAs: displayStatus(job, today) };
  });
}

export function countByStatus(jobs: JobRow[]): Record<JobDisplayStatus | "all", number> {
  const counts = { all: jobs.length, published: 0, draft: 0, expired: 0 };
  for (const job of jobs) counts[job.shownAs]++;
  return counts;
}

// The saved job, in the shape the form edits
export function toJobInput(job: Job): JobInput {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    category: jobDraftSchema.shape.category.catch("").parse(job.category),
    type: jobDraftSchema.shape.type.catch("Full-time").parse(job.type),
    workMode: jobDraftSchema.shape.workMode.catch("On-site").parse(job.workMode),
    salary: job.salary ?? "",
    summary: job.summary,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    deadline: isoDay(job.deadline),
    openEnded: job.status !== "DRAFT" && !job.deadline,
    apply: applySchema.catch(applySchema.parse({})).parse(job.apply),
    source: job.source ?? "",
  };
}

export async function getJob(member: CurrentMember, id: string) {
  assertCan(member, "postJobs");
  return repo.findJob(member.tenant.id, id);
}

function columns(job: JobInput) {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    category: job.category,
    type: job.type,
    workMode: job.workMode,
    salary: job.salary || null,
    summary: job.summary,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    deadline: job.deadline ? new Date(`${job.deadline}T00:00:00Z`) : null,
    apply: job.apply,
    source: job.source || null,
  };
}

const toFieldErrors = (problems: { path: string; message: string }[]): FieldErrors =>
  Object.fromEntries(problems.map((problem) => [problem.path, problem.message]));

export async function saveJob(
  member: CurrentMember,
  jobId: string | null,
  raw: unknown,
  intent: SaveIntent,
): Promise<SaveResult> {
  assertCan(member, "postJobs");
  const parsed = jobDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: toFieldErrors(parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))),
    };
  }
  const job = parsed.data;
  if (intent === "publish") {
    const problems = publishProblems(job);
    if (problems.length) return { ok: false, fieldErrors: toFieldErrors(problems) };
  }

  const tenantId = member.tenant.id;
  const existing = jobId ? await repo.findJob(tenantId, jobId) : null;
  if (jobId && !existing) return { ok: false, fieldErrors: { title: "This job no longer exists" } };

  const status = intent === "publish" ? "PUBLISHED" : "DRAFT";
  // A job counts as "posted" the first time it goes live, so the website lists it as new
  const firstPublish = intent === "publish" && existing?.status !== "PUBLISHED";
  const timing = firstPublish ? { postedAt: new Date() } : {};

  if (existing) {
    await repo.updateJob(tenantId, existing.id, { ...columns(job), status, ...timing });
    return { ok: true, id: existing.id, published: status === "PUBLISHED" };
  }
  const base = slugify(job.title, job.company);
  const slug = uniqueSlug(base, await repo.findSlugsStartingWith(tenantId, base));
  const created = await repo.createJob(tenantId, { ...columns(job), slug, status, createdById: member.id, ...timing });
  return { ok: true, id: created.id, published: status === "PUBLISHED" };
}

// Publish or move back to drafts from the jobs list. Returns a problem to show, or null.
export async function setPublished(member: CurrentMember, id: string, publish: boolean): Promise<string | null> {
  assertCan(member, "postJobs");
  const job = await repo.findJob(member.tenant.id, id);
  if (!job) return "This job no longer exists.";
  if (publish) {
    const problems = publishProblems(toJobInput(job));
    if (problems.length) return `Can't publish yet: ${problems.map((p) => p.message.toLowerCase()).join("; ")}.`;
  }
  const firstPublish = publish && job.status !== "PUBLISHED";
  await repo.updateJob(member.tenant.id, id, {
    status: publish ? "PUBLISHED" : "DRAFT",
    ...(firstPublish ? { postedAt: new Date() } : {}),
  });
  return null;
}

export async function removeJob(member: CurrentMember, id: string): Promise<void> {
  assertCan(member, "postJobs");
  // Poster images live outside the database, so remove them before the job row goes
  await removePoster(member, id);
  await repo.deleteJob(member.tenant.id, id);
}
