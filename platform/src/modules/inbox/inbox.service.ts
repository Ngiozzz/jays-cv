import "server-only";
import { randomBytes } from "node:crypto";
import { fileStore } from "@/lib/storage";
import { AiUnavailableError, readJobPoster } from "@/modules/ai/claude";
import type { LinkResult } from "@/modules/ai/links";
import { READING_FIELDS, readingToJobInput } from "@/modules/ai/poster-reading";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import { createPosterRecord, findJob } from "@/modules/jobs/jobs.repo";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { saveJob } from "@/modules/jobs/jobs.service";
import { EMPTY_JOB, jobDraftSchema, publishProblems, type JobInput } from "@/modules/jobs/jobs.schema";
import { isPosterType, posterProblem } from "@/modules/jobs/poster";
import { advertText, captionExtras, type AdvertText, type ReadJob } from "@/modules/jobs/poster.service";
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
    const { extras, links } = await captionExtras(item.caption);
    const { data, usage } = await readJobPoster(image, todayInNairobi(), extras);
    if (usage) await recordUsage(tenantId, { feature: "Poster reading", memberId: member.id, ...usage });
    const [first, ...others] = data.isJobAdvert ? data.jobs : [];
    const advert = {
      rawText: advertText(data.rawText, item.caption),
      scamRisk: data.scamRisk,
      scamReason: data.scamReason,
    };
    await repo.updateInboxItem(tenantId, id, {
      state: "CHECK",
      rawText: advert.rawText,
      links,
      scamRisk: first ? data.scamRisk : null,
      scamReason: first ? data.scamReason : null,
      reading: first ? readingToJobInput(first) : { ...EMPTY_JOB, title: "" },
      unsure: first?.unsureFields ?? [],
      checked: [],
      readError: first ? null : "This doesn't look like a job advert.",
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
    });
    // A poster listing several jobs: one item each, replacing any from an earlier reading
    if (!item.splitFromId) {
      const old = await repo.takeUndecidedSplits(tenantId, id);
      await Promise.all(old.map((split) => fileStore.remove("job-posters", split.posterPath)));
      for (const other of others) {
        await addSplit(member, item, bytes, links, advert, {
          job: readingToJobInput(other),
          unsure: other.unsureFields,
        });
      }
    }
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

type PosterFile = Pick<
  NonNullable<Awaited<ReturnType<typeof repo.findInboxItem>>>,
  "id" | "posterName" | "posterType" | "source" | "caption"
>;

// One more job from the same poster, read and waiting to be checked. It gets its own copy of the
// image, so publishing, replacing or clearing up one job's poster never touches the others.
async function addSplit(
  member: CurrentMember,
  poster: PosterFile,
  bytes: Uint8Array,
  links: LinkResult[],
  advert: AdvertText,
  read: ReadJob,
) {
  const tenantId = member.tenant.id;
  const path = posterBucketPath(tenantId, randomBytes(12).toString("hex"), poster.posterType);
  await fileStore.put("job-posters", path, bytes, poster.posterType);
  await repo.createInboxItem(tenantId, {
    state: "CHECK",
    splitFromId: poster.id,
    posterPath: path,
    posterName: poster.posterName,
    posterType: poster.posterType,
    posterBytes: bytes.length,
    source: poster.source,
    caption: poster.caption,
    links,
    rawText: advert.rawText,
    scamRisk: advert.scamRisk,
    scamReason: advert.scamReason,
    reading: read.job,
    unsure: read.unsure,
    checked: [],
    addedById: member.id,
    readAt: new Date(),
  });
}

// "Read again" with the text that was posted with the poster: queued like a new poster, so the
// screen reads it a moment later. Jobs split off it that haven't been dealt with are replaced.
export async function rereadInboxItem(member: CurrentMember, id: string, caption: string): Promise<Result> {
  assertCan(member, "postJobs");
  const item = await repo.findInboxItem(member.tenant.id, id);
  if (!item || item.state !== "CHECK")
    return { ok: false, error: "Only posters waiting to be checked can be read again." };
  if (item.splitFromId) return { ok: false, error: "Read the poster again from its first job." };
  await repo.updateInboxItem(member.tenant.id, id, {
    state: "READING",
    caption: caption.trim().slice(0, MAX_CAPTION),
    readAt: null,
    readError: null,
  });
  return { ok: true };
}

export const MAX_CAPTION = 5000;

// Post a job read a poster listing several jobs: the others wait in Bulk post, already read
export async function addReadJobs(
  member: CurrentMember,
  file: File,
  caption: string,
  links: LinkResult[],
  advert: AdvertText,
  jobs: ReadJob[],
): Promise<Result> {
  assertCan(member, "postJobs");
  const problem = posterProblem(file);
  if (problem || !isPosterType(file.type)) return { ok: false, error: problem ?? "Please choose an image." };
  if (!jobs.length) return { ok: false, error: "There are no other jobs to add." };
  const tenantId = member.tenant.id;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = posterBucketPath(tenantId, randomBytes(12).toString("hex"), file.type);
  await fileStore.put("job-posters", path, bytes, file.type);
  const [first, ...rest] = jobs;
  const root = await repo.createInboxItem(tenantId, {
    state: "CHECK",
    posterPath: path,
    posterName: file.name || "poster",
    posterType: file.type,
    posterBytes: file.size,
    source: "Uploaded",
    caption: caption.slice(0, MAX_CAPTION),
    links,
    rawText: advert.rawText,
    scamRisk: advert.scamRisk,
    scamReason: advert.scamReason,
    reading: first.job,
    unsure: first.unsure,
    checked: [],
    addedById: member.id,
    readAt: new Date(),
  });
  for (const read of rest) await addSplit(member, root, bytes, links, advert, read);
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
