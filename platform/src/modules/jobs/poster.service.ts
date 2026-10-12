import "server-only";
import { randomBytes } from "node:crypto";
import { fileStore } from "@/lib/storage";
import { AiUnavailableError, readJobPoster } from "@/modules/ai/claude";
import { readingToJobInput } from "@/modules/ai/poster-reading";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import * as repo from "./jobs.repo";
import { todayInNairobi } from "./jobs.rules";
import type { JobInput } from "./jobs.schema";
import { isPosterType, posterPath, posterProblem } from "./poster";

export type ReadPosterResult = { ok: true; job: JobInput; pretend: boolean } | { ok: false; error: string };

// "Read poster & fill in details": the AI reads the image; the person checks the result before publishing
export async function readPoster(member: CurrentMember, file: File): Promise<ReadPosterResult> {
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
    const { data, usage } = await readJobPoster(image, todayInNairobi());
    if (usage) {
      await recordUsage(member.tenant.id, { feature: "Poster reading", memberId: member.id, ...usage });
    }
    if (!data.isJobAdvert) {
      return { ok: false, error: "This image doesn't look like a job advert. Please check you chose the right one." };
    }
    return { ok: true, job: readingToJobInput(data), pretend: !usage };
  } catch (error) {
    if (error instanceof AiUnavailableError) return { ok: false, error: error.message };
    throw error;
  }
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
