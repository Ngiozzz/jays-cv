import "server-only";
import { randomBytes } from "node:crypto";
import { fileStore } from "@/lib/storage";
import { AiUnavailableError, readJobPoster } from "@/modules/ai/claude";
import { READING_FIELDS, readingToJobInput } from "@/modules/ai/poster-reading";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import { createPosterRecord, findJob } from "@/modules/jobs/jobs.repo";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { saveJob } from "@/modules/jobs/jobs.service";
import { EMPTY_JOB, jobDraftSchema, publishProblems, type JobInput } from "@/modules/jobs/jobs.schema";
import { isPosterType, posterProblem } from "@/modules/jobs/poster";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import * as repo from "./inbox.repo";

export const MAX_POSTERS_PER_BATCH = 30;
export const DISCARD_REASONS = ["scam", "duplicate", "expired", "not-a-job", "other"] as const;
export type DiscardReason = (typeof DISCARD_REASONS)[number];

type Result = { ok: true } | { ok: false; error: string };

const posterBucketPath = (tenantId: string, randomPart: string, type: string) =>
  `${tenantId}/inbox/${randomPart}.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`;

// Saves the posters and queues them for reading. Nothing is read or published yet.
export async function addPosters(member: CurrentMember, files: File[], source: string): Promise<Result> {
  assertCan(member, "postJobs");
  if (!files.length) return { ok: false, error: "Choose at least one poster image." };
  if (files.length > MAX_POSTERS_PER_BATCH)
    return { ok: false, error: `Add up to ${MAX_POSTERS_PER_BATCH} posters at a time.` };
  const problem = files.map(posterProblem).find(Boolean);
  if (problem) return { ok: false, error: problem };

  const tenantId = member.tenant.id;
  for (const file of files) {
    const path = posterBucketPath(tenantId, randomBytes(12).toString("hex"), file.type);
    await fileStore.put("job-posters", path, new Uint8Array(await file.arrayBuffer()), file.type);
    await repo.createInboxItem(tenantId, {
      posterPath: path,
      posterName: file.name || "poster",
      posterType: file.type,
      posterBytes: file.size,
      source,
      unsure: [],
      checked: [],
      addedById: member.id,
    });
  }
  return { ok: true };
}

// Reads one waiting poster with the AI. The browser calls this for each poster, a few at a time.
export async function readInboxItem(member: CurrentMember, id: string): Promise<Result> {
  assertCan(member, "postJobs");
  const tenantId = member.tenant.id;
  if ((await getTokenBalance(tenantId)).remaining <= 0) {
    return { ok: false, error: "Your AI tokens have run out. Ask your developer for more." };
  }
  // Another browser may already be reading this one
  if (!(await repo.claimForReading(tenantId, id))) return { ok: true };
  const item = await repo.findInboxItem(tenantId, id);
  if (!item || !isPosterType(item.posterType)) return { ok: false, error: "Poster not found." };

  try {
    const bytes = await fileStore.get("job-posters", item.posterPath);
    const image = {
      base64: Buffer.from(bytes).toString("base64"),
      mediaType: item.posterType,
      fileName: item.posterName,
    };
    const { data, usage } = await readJobPoster(image, todayInNairobi());
    if (usage) await recordUsage(tenantId, { feature: "Poster reading", memberId: member.id, ...usage });
    await repo.updateInboxItem(tenantId, id, {
      state: "CHECK",
      rawText: data.rawText,
      reading: data.isJobAdvert ? readingToJobInput(data) : { ...EMPTY_JOB, title: "" },
      unsure: data.unsureFields,
      readError: data.isJobAdvert ? null : "This doesn't look like a job advert.",
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
    });
  } catch (error) {
    // The team can still type the details from the poster
    const message = error instanceof AiUnavailableError ? error.message : "The AI couldn't read this poster.";
    await repo.updateInboxItem(tenantId, id, {
      state: "CHECK",
      reading: { ...EMPTY_JOB, title: "" },
      readError: `${message} Type the details from the poster.`,
    });
    if (!(error instanceof AiUnavailableError)) console.error("Poster reading failed", error);
  }
  return { ok: true };
}

// Publishes the poster as a job, with the team's corrections. The screen has already asked about
// scams, duplicates and expired deadlines; this checks the job is complete.
export async function approveInboxItem(
  member: CurrentMember,
  id: string,
  edited: unknown,
): Promise<{ ok: true; slug: string; companyId: string | null } | { ok: false; error: string }> {
  assertCan(member, "postJobs");
  const tenantId = member.tenant.id;
  const item = await repo.findInboxItem(tenantId, id);
  if (!item || item.state !== "CHECK") return { ok: false, error: "This poster has already been dealt with." };

  const parsed = jobDraftSchema.safeParse(edited);
  if (!parsed.success) return { ok: false, error: "Add the job title." };
  // Where the advert was found: as typed on the screen, else where the poster came from
  const job: JobInput = {
    ...parsed.data,
    source: parsed.data.source || (item.source === "Uploaded" ? "" : item.source),
  };
  const problems = publishProblems(job);
  if (problems.length) return { ok: false, error: problems.map((p) => p.message).join(". ") + "." };

  const saved = await saveJob(member, null, job, "publish");
  if (!saved.ok) return { ok: false, error: Object.values(saved.fieldErrors).join(". ") };
  // The poster file becomes the published job's poster
  await createPosterRecord(tenantId, {
    jobId: saved.id,
    storagePath: item.posterPath,
    name: item.posterName,
    mimeType: item.posterType,
    sizeBytes: item.posterBytes,
    uploadedBy: member.name,
  });
  await repo.updateInboxItem(tenantId, id, {
    state: "APPROVED",
    reading: job,
    jobId: saved.id,
    decidedById: member.id,
    decidedAt: new Date(),
  });
  const published = await findJob(tenantId, saved.id);
  return { ok: true, slug: published?.slug ?? "", companyId: saved.companyId ?? null };
}

export async function discardInboxItem(
  member: CurrentMember,
  id: string,
  reason: DiscardReason,
  edited: unknown,
): Promise<Result> {
  assertCan(member, "postJobs");
  const item = await repo.findInboxItem(member.tenant.id, id);
  if (!item || item.state !== "CHECK") return { ok: false, error: "This poster has already been dealt with." };
  const parsed = jobDraftSchema.safeParse(edited);
  await repo.updateInboxItem(member.tenant.id, id, {
    state: "DISCARDED",
    discardReason: reason,
    ...(parsed.success ? { reading: parsed.data } : {}),
    decidedById: member.id,
    decidedAt: new Date(),
  });
  return { ok: true };
}

// Brings a discarded poster back for checking (within the week it's kept)
export async function restoreInboxItem(member: CurrentMember, id: string): Promise<Result> {
  assertCan(member, "postJobs");
  const item = await repo.findInboxItem(member.tenant.id, id);
  if (!item || item.state !== "DISCARDED") return { ok: false, error: "Only discarded posters can be restored." };
  await repo.updateInboxItem(member.tenant.id, id, {
    state: "CHECK",
    discardReason: null,
    decidedById: null,
    decidedAt: null,
  });
  return { ok: true };
}

// "Looks right": a person has checked a field the AI wasn't sure about
export async function confirmInboxField(member: CurrentMember, id: string, field: string): Promise<Result> {
  assertCan(member, "postJobs");
  if (!READING_FIELDS.includes(field as (typeof READING_FIELDS)[number])) return { ok: false, error: "Unknown field." };
  const item = await repo.findInboxItem(member.tenant.id, id);
  if (!item) return { ok: false, error: "Poster not found." };
  if (!item.checked.includes(field)) {
    await repo.updateInboxItem(member.tenant.id, id, { checked: [...item.checked, field] });
  }
  return { ok: true };
}
