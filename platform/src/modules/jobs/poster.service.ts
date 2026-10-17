import "server-only";
import { randomBytes } from "node:crypto";
import { fileStore } from "@/lib/storage";
import { AiUnavailableError, readJobPoster } from "@/modules/ai/claude";
import { readLinks } from "@/modules/ai/link-reader";
import { findLinks, type LinkResult } from "@/modules/ai/links";
import { readingToJobInput, type ScamRisk } from "@/modules/ai/poster-reading";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import { scamFlag, type Flag } from "@/modules/inbox/inbox.flags";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import * as repo from "./jobs.repo";
import { todayInNairobi } from "./jobs.rules";
import type { JobInput } from "./jobs.schema";
import { isPosterType, posterPath, posterProblem } from "./poster";

// One job from the poster, and the fields the AI couldn't read confidently (for the person to check)
export type ReadJob = { job: JobInput; unsure: string[] };

// What the scam checks need about the whole advert, kept if the other jobs go to Bulk post
export type AdvertText = { rawText: string; scamRisk: ScamRisk; scamReason: string };

export type ReadPosterResult =
  | {
      ok: true;
      // Usually one; a poster listing several jobs gives one each
      jobs: ReadJob[];
      // The links in the posted text, and whether each could be read
      links: LinkResult[];
      advert: AdvertText;
      pretend: boolean;
      scam: Pick<Flag, "level" | "text" | "more"> | null;
    }
  | { ok: false; error: string };

// Opens the links in the text posted with a poster, for the AI to read alongside it
export async function captionExtras(caption: string) {
  const pages = await readLinks(findLinks(caption));
  return {
    extras: { caption, pages },
    links: pages.map(({ url, finalUrl, ok, reason }) => ({ url, finalUrl, ok, reason })),
  };
}

// "Read poster & fill in details": the AI reads the image (and the text posted with it, and the pages
// its links lead to); the person checks the result before publishing
export async function readPoster(member: CurrentMember, file: File, caption: string): Promise<ReadPosterResult> {
  assertCan(member, "postJobs");
  const problem = posterProblem(file);
  if (problem || !isPosterType(file.type)) return { ok: false, error: problem ?? "Please choose an image." };

  const balance = await getTokenBalance(member.tenant.id);
  if (balance.remaining <= 0) {
    return { ok: false, error: "Your AI tokens have run out. Ask your developer for more, or type the details in." };
  }

  try {
    const image = {
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      mediaType: file.type,
      fileName: file.name,
    };
    const { extras, links } = await captionExtras(caption);
    const { data, usage } = await readJobPoster(image, todayInNairobi(), extras);
    if (usage) {
      await recordUsage(member.tenant.id, { feature: "Poster reading", memberId: member.id, ...usage });
    }
    if (!data.isJobAdvert) {
      return { ok: false, error: "This image doesn't look like a job advert. Please check you chose the right one." };
    }
    const jobs = data.jobs.map((reading) => ({ job: readingToJobInput(reading), unsure: reading.unsureFields }));
    const advert = { rawText: advertText(data.rawText, caption), scamRisk: data.scamRisk, scamReason: data.scamReason };
    const scam = scamFlag(advert.rawText, jobs[0].job.salary, { risk: data.scamRisk, reason: data.scamReason });
    return {
      ok: true,
      jobs,
      links,
      advert,
      pretend: !usage,
      scam: scam && { level: scam.level, text: scam.text, more: scam.more },
    };
  } catch (error) {
    if (error instanceof AiUnavailableError) return { ok: false, error: error.message };
    throw error;
  }
}

// The scam checks look at the poster's words and at the text posted with it
export function advertText(posterText: string, caption: string): string {
  return [posterText, caption.trim()].filter(Boolean).join("\n\n");
}

// Saves the poster with the job, replacing any earlier one
export async function attachPoster(member: CurrentMember, jobId: string, file: File): Promise<void> {
  assertCan(member, "postJobs");
  if (posterProblem(file) || !isPosterType(file.type)) throw new Error("Not a valid poster image");
  const tenantId = member.tenant.id;
  const storagePath = posterPath(tenantId, jobId, file.type, randomBytes(12).toString("hex"));
  await fileStore.put("job-posters", storagePath, new Uint8Array(await file.arrayBuffer()), file.type);
  const previous = await repo.findPosters(tenantId, jobId);
  await repo.createPosterRecord(tenantId, {
    jobId,
    storagePath,
    name: file.name || "poster",
    mimeType: file.type,
    sizeBytes: file.size,
    uploadedBy: member.name,
  });
  await deletePosters(tenantId, previous);
}

export async function removePoster(member: CurrentMember, jobId: string): Promise<void> {
  assertCan(member, "postJobs");
  await deletePosters(member.tenant.id, await repo.findPosters(member.tenant.id, jobId));
}

async function deletePosters(tenantId: string, posters: { id: string; storagePath: string }[]) {
  if (!posters.length) return;
  await Promise.all(posters.map((poster) => fileStore.remove("job-posters", poster.storagePath)));
  await repo.deleteFileRecords(
    tenantId,
    posters.map((poster) => poster.id),
  );
}

export async function posterUrl(tenantId: string, jobId: string): Promise<string | null> {
  const [latest] = await repo.findPosters(tenantId, jobId);
  return latest ? fileStore.publicUrl("job-posters", latest.storagePath) : null;
}
