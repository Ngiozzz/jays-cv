import "server-only";
import { randomBytes } from "node:crypto";
import { fileStore } from "@/lib/storage";
import { AiUnavailableError, readJobPage, readJobPoster } from "@/modules/ai/claude";
import { htmlToText, type LinkResult } from "@/modules/ai/links";
import type { JobPage } from "@/modules/ai/page-reading";
import { READING_FIELDS, readingToJobInput } from "@/modules/ai/poster-reading";
import { AI_PAUSED_MESSAGE, aiStopped } from "@/modules/ai/tokens";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import { sureDuplicate } from "@/modules/job-sources/duplicates";
import { getJobBoard } from "@/modules/jobs/jobs.public";
import { createAdvertPdfRecord, createPosterRecord, findJob } from "@/modules/jobs/jobs.repo";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { saveJob } from "@/modules/jobs/jobs.service";
import { EMPTY_JOB, jobDraftSchema, publishProblems, type JobInput } from "@/modules/jobs/jobs.schema";
import { isPosterType, posterProblem } from "@/modules/jobs/poster";
import { advertText, captionExtras, type AdvertText, type ReadJob } from "@/modules/jobs/poster.service";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { bodyText, fetchPolitely, isPdf, MAX_PAGE_BYTES, MAX_PDF_BYTES, Unreadable } from "@/modules/job-sources/fetch";
import { extraBannedSites } from "@/modules/job-sources/job-sources.repo";
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

// Reads one waiting poster (or job page) with the AI. The browser calls this for each one, a few at a time.
export async function readInboxItem(member: CurrentMember, id: string): Promise<Result> {
  assertCan(member, "postJobs");
  const tenantId = member.tenant.id;
  const stopped = aiStopped(await getTokenBalance(tenantId));
  if (stopped === "paused") return { ok: false, error: AI_PAUSED_MESSAGE };
  if (stopped) return { ok: false, error: "Your AI tokens have run out. Ask your developer for more." };
  // Another browser may already be reading this one
  if (!(await repo.claimForReading(tenantId, id))) return { ok: true };
  const item = await repo.findInboxItem(tenantId, id);
  if (!item) return { ok: false, error: "Poster not found." };
  if (!item.pageUrl && !isPosterType(item.posterType)) return { ok: false, error: "Poster not found." };
  await readClaimedItem(tenantId, item, member.id);
  return { ok: true };
}

type ItemRow = NonNullable<Awaited<ReturnType<typeof repo.findInboxItem>>>;

// Reads an item that has been claimed for reading: a poster image, or a job source's web page or PDF.
// Used by the Bulk post screen and by the morning job-sources run (memberId null).
export async function readClaimedItem(tenantId: string, item: ItemRow, memberId: string | null): Promise<void> {
  const today = todayInNairobi();
  const fromPage = Boolean(item.pageUrl && !item.posterPath);
  try {
    const { extras, links } = await captionExtras(item.caption);
    let bytes: Uint8Array | null = null;
    let pdf: { path: string; bytes: Uint8Array } | null = null;
    let answer: Awaited<ReturnType<typeof readJobPoster>>;
    let pageText = "";
    if (fromPage) {
      const page = await openJobPage(tenantId, item.pageUrl!);
      pageText = page.kind === "text" ? page.text : "";
      answer = await readJobPage(page, item.source, today);
      // A PDF advert is kept, to show beside the details and offer with the published job
      if (page.kind === "pdf") pdf = await keepAdvertPdf(tenantId, item, Buffer.from(page.base64, "base64"));
    } else {
      if (!item.posterPath || !isPosterType(item.posterType)) throw new Error("The poster image is missing");
      bytes = await fileStore.get("job-posters", item.posterPath);
      const image = {
        base64: Buffer.from(bytes).toString("base64"),
        mediaType: item.posterType,
        fileName: item.posterName,
      };
      answer = await readJobPoster(image, today, extras);
    }
    const { data, usage } = answer;
    if (usage) {
      await recordUsage(tenantId, { feature: fromPage ? "Job sources" : "Poster reading", memberId, ...usage });
    }
    const [first, ...others] = data.isJobAdvert ? data.jobs : [];
    const advert = {
      rawText: advertText(pageText || data.rawText, item.caption),
      scamRisk: data.scamRisk,
      scamReason: data.scamReason,
    };
    const job = first ? readingToJobInput(first) : null;
    await repo.updateInboxItem(tenantId, item.id, {
      state: "CHECK",
      rawText: advert.rawText,
      links,
      scamRisk: first ? data.scamRisk : null,
      scamReason: first ? data.scamReason : null,
      reading: job ?? { ...EMPTY_JOB, title: "" },
      unsure: first?.unsureFields ?? [],
      checked: [],
      readError: first ? null : "This doesn't look like a job advert.",
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      ...(pdf ? { advertPdfPath: pdf.path, advertPdfBytes: pdf.bytes.length } : {}),
    });
    if (fromPage) await dropIfNotWanted(tenantId, item.id, job, today, item.splitFromId ?? item.id);
    // An advert listing several jobs: one item each, replacing any from an earlier reading
    if (!item.splitFromId) {
      const old = await repo.takeUndecidedSplits(tenantId, item.id);
      await Promise.all(
        old.flatMap((split) => [
          ...(split.posterPath ? [fileStore.remove("job-posters", split.posterPath)] : []),
          ...(split.advertPdfPath ? [fileStore.remove("job-adverts", split.advertPdfPath)] : []),
        ]),
      );
      for (const other of others) {
        const split = await addSplit(
          tenantId,
          memberId,
          item,
          bytes,
          links,
          advert,
          {
            job: readingToJobInput(other),
            unsure: other.unsureFields,
          },
          pdf?.bytes ?? null,
        );
        if (fromPage) await dropIfNotWanted(tenantId, split.id, split.reading as JobInput, today, item.id);
      }
    }
  } catch (error) {
    // The team can still type the details from the poster (or the page)
    const what = fromPage ? "page" : "poster";
    const message =
      error instanceof AiUnavailableError
        ? error.message
        : error instanceof Unreadable
          ? `The job page couldn't be opened: ${error.message}.`
          : `The AI couldn't read this ${what}.`;
    await repo.updateInboxItem(tenantId, item.id, {
      state: "CHECK",
      reading: { ...EMPTY_JOB, title: "" },
      readError: `${message} Type the details from the ${what}${fromPage ? ", or discard it" : ""}.`,
    });
    if (!(error instanceof AiUnavailableError) && !(error instanceof Unreadable)) {
      console.error(`${fromPage ? "Job page" : "Poster"} reading failed`, error);
    }
  }
}

// Saves the PDF advert (replacing an earlier copy of the same item, e.g. when it is read again)
async function keepAdvertPdf(tenantId: string, item: ItemRow, bytes: Uint8Array) {
  if (item.advertPdfPath) await fileStore.remove("job-adverts", item.advertPdfPath).catch(() => {});
  const path = advertPdfPath(tenantId);
  await fileStore.put("job-adverts", path, bytes, "application/pdf");
  return { path, bytes };
}

const advertPdfPath = (tenantId: string) => `${tenantId}/inbox/${randomBytes(12).toString("hex")}.pdf`;

// A job source's advert page, ready for the AI: its text, or the PDF itself
async function openJobPage(tenantId: string, url: string): Promise<JobPage> {
  const fetched = await fetchPolitely(url, {
    banned: await extraBannedSites(tenantId),
    robots: new Map(),
    accept: "text/html,application/pdf;q=0.9,text/plain;q=0.8,*/*;q=0.5",
    maxBytes: MAX_PDF_BYTES,
  });
  if (isPdf(fetched)) return { kind: "pdf", url, base64: Buffer.from(fetched.body).toString("base64") };
  if (fetched.body.length > MAX_PAGE_BYTES) throw new Unreadable("the page is too big");
  const text = htmlToText(bodyText(fetched));
  if (text.length < 200) throw new Unreadable("the page only works in a web browser");
  return { kind: "text", url, text };
}

// Jobs found by a job source that nobody needs to look at: the deadline has passed, it isn't a job
// advert, or it is surely a job already on the board or already waiting here (same company, title
// and deadline). They are set aside as discarded (kept a week, so they can be restored). Jobs that
// only look alike stay, with Bulk post's "Duplicate" flag for a person to decide.
async function dropIfNotWanted(tenantId: string, id: string, job: JobInput | null, today: string, advertId: string) {
  const expired = Boolean(job && !job.openEnded && job.deadline && job.deadline < today);
  const setAside = (discardReason: string, duplicateOfSlug: string | null = null) =>
    repo.updateInboxItem(tenantId, id, { state: "DISCARDED", discardReason, duplicateOfSlug, decidedAt: new Date() });
  if (!job || expired) return setAside(expired ? "expired" : "not-a-job");

  const comparable = { title: job.title, company: job.company, deadline: job.openEnded ? null : job.deadline };
  const { jobs: live } = await getJobBoard(tenantId);
  const onBoard = sureDuplicate(comparable, live);
  if (onBoard) return setAside("duplicate", onBoard.slug);
  const waiting = (await repo.findReadWaiting(tenantId, id, advertId)).flatMap((other) => {
    const parsed = jobDraftSchema.safeParse(other.reading);
    if (!parsed.success) return [];
    const { title, company, openEnded, deadline } = parsed.data;
    return [{ title, company, deadline: openEnded ? null : deadline }];
  });
  if (sureDuplicate(comparable, waiting)) return setAside("duplicate");
}

type PosterFile = Pick<ItemRow, "id" | "posterName" | "posterType" | "source" | "caption" | "pageUrl" | "jobSourceId">;

// One more job from the same advert, read and waiting to be checked. A poster's job gets its own
// copy of the image, so publishing, replacing or clearing up one job's poster never touches the
// others; a job page's job shares the page's address.
async function addSplit(
  tenantId: string,
  memberId: string | null,
  poster: PosterFile,
  bytes: Uint8Array | null,
  links: LinkResult[],
  advert: AdvertText,
  read: ReadJob,
  pdfBytes: Uint8Array | null = null,
) {
  let path: string | null = null;
  if (bytes) {
    path = posterBucketPath(tenantId, randomBytes(12).toString("hex"), poster.posterType);
    await fileStore.put("job-posters", path, bytes, poster.posterType);
  }
  // Each job from a PDF listing several gets its own copy, like posters
  let pdfPath: string | null = null;
  if (pdfBytes) {
    pdfPath = advertPdfPath(tenantId);
    await fileStore.put("job-adverts", pdfPath, pdfBytes, "application/pdf");
  }
  return repo.createInboxItem(tenantId, {
    state: "CHECK",
    splitFromId: poster.id,
    posterPath: path,
    posterName: poster.posterName,
    posterType: poster.posterType,
    posterBytes: bytes?.length ?? 0,
    source: poster.source,
    pageUrl: poster.pageUrl,
    jobSourceId: poster.jobSourceId,
    advertPdfPath: pdfPath,
    advertPdfBytes: pdfBytes?.length ?? 0,
    caption: poster.caption,
    links,
    rawText: advert.rawText,
    scamRisk: advert.scamRisk,
    scamReason: advert.scamReason,
    reading: read.job,
    unsure: read.unsure,
    checked: [],
    addedById: memberId,
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
  for (const read of rest) await addSplit(tenantId, member.id, root, bytes, links, advert, read);
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
  // The poster file becomes the published job's poster (a job page has none)
  if (item.posterPath)
    await createPosterRecord(tenantId, {
      jobId: saved.id,
      storagePath: item.posterPath,
      name: item.posterName,
      mimeType: item.posterType,
      sizeBytes: item.posterBytes,
      uploadedBy: member.name,
    });
  // A PDF advert goes with the job: job seekers can download the original
  if (item.advertPdfPath)
    await createAdvertPdfRecord(tenantId, {
      jobId: saved.id,
      storagePath: item.advertPdfPath,
      name: `${job.title || "Job advert"}.pdf`,
      sizeBytes: item.advertPdfBytes,
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
    duplicateOfSlug: null,
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
