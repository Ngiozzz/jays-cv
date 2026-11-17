import "server-only";
import { fileStore } from "@/lib/storage";
import { tenantDb } from "@/lib/tenant-db";
import { SCAM_RISKS, type ScamRisk } from "@/modules/ai/poster-reading";
import { flagsFor, isClean, type Flag } from "@/modules/inbox/inbox.flags";
import { getJobBoard } from "@/modules/jobs/jobs.public";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { jobDraftSchema, type JobInput } from "@/modules/jobs/jobs.schema";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";

// "Jobs found": every job the job sources have found lately, what became of it, and (for those
// waiting to be checked) everything needed to review and publish it straight from the list

export type FoundStatus = "waiting" | "check" | "published" | "discarded";

export type FoundJob = {
  id: string;
  source: string;
  sourceId: string | null;
  // The job's title once read; before that, the words of the link it was found under
  title: string;
  read: boolean;
  company: string;
  deadline: string | null;
  status: FoundStatus;
  // Why it was set aside: "expired", "not-a-job", "scam", "duplicate", "other"
  discardReason: string | null;
  readError: string | null;
  pageUrl: string | null;
  jobSlug: string | null;
  // Set aside because this live job is the same one
  duplicateOfSlug: string | null;
  // What the AI check thought ("job", "not-a-job", "closed", "internal", "unsure") and why
  aiCheck: string | null;
  aiCheckReason: string | null;
  foundAt: string;
  // The whole job as read, for the full view (null until read)
  job: JobInput | null;
  // Bulk post's checks (scam, duplicate, deadline, doubts, missing details); only for jobs waiting
  flags: Flag[];
  // No warnings: ready to publish as it is
  clean: boolean;
  // Our copy of a PDF advert
  pdfUrl: string | null;
};

// The last month of finds is shown
const SHOW_DAYS = 30;

export async function loadFoundJobs(member: CurrentMember): Promise<FoundJob[]> {
  assertCan(member, "manageJobSources");
  const tenantId = member.tenant.id;
  const db = tenantDb(tenantId);
  const [rows, waiting, board] = await Promise.all([
    db.inboxItem.findMany({
      where: {
        jobSourceId: { not: null },
        createdAt: { gte: new Date(Date.now() - SHOW_DAYS * 86_400_000) },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        state: true,
        source: true,
        jobSourceId: true,
        posterName: true,
        reading: true,
        readError: true,
        discardReason: true,
        pageUrl: true,
        duplicateOfSlug: true,
        aiCheck: true,
        aiCheckReason: true,
        advertPdfPath: true,
        rawText: true,
        unsure: true,
        checked: true,
        scamRisk: true,
        scamReason: true,
        createdAt: true,
        job: { select: { slug: true } },
      },
    }),
    // Everything waiting in Bulk post (posters too), oldest first: a job is a duplicate of an earlier one
    db.inboxItem.findMany({
      where: { state: "CHECK" },
      orderBy: { createdAt: "asc" },
      select: { id: true, reading: true },
    }),
    getJobBoard(tenantId),
  ]);

  const today = todayInNairobi();
  const liveJobs = board.jobs.map(({ title, company, postedDay }) => ({ title, company, postedDay }));
  const order = waiting.map((item) => item.id);
  const titles = waiting.map((item) => {
    const parsed = jobDraftSchema.safeParse(item.reading);
    return parsed.success ? { title: parsed.data.title, company: parsed.data.company } : null;
  });

  return rows.map((row) => {
    const parsed = row.reading ? jobDraftSchema.safeParse(row.reading) : null;
    const job = parsed?.success ? parsed.data : null;
    const read = row.state !== "READING";
    const flags =
      row.state === "CHECK" && job
        ? flagsFor(job, {
            today,
            rawText: row.rawText,
            aiScam: (SCAM_RISKS as readonly string[]).includes(row.scamRisk ?? "")
              ? { risk: row.scamRisk as ScamRisk, reason: row.scamReason ?? "" }
              : null,
            unsure: row.unsure,
            checked: row.checked,
            liveJobs,
            earlierPosters: titles
              .slice(0, Math.max(0, order.indexOf(row.id)))
              .filter((other): other is { title: string; company: string } => Boolean(other)),
          })
        : [];
    return {
      id: row.id,
      source: row.source,
      sourceId: row.jobSourceId,
      title: (read && job?.title) || row.posterName,
      read,
      company: job?.company ?? "",
      deadline: job && !job.openEnded ? job.deadline : null,
      status:
        row.state === "READING"
          ? "waiting"
          : row.state === "CHECK"
            ? "check"
            : row.state === "APPROVED"
              ? "published"
              : "discarded",
      discardReason: row.discardReason,
      readError: row.readError,
      pageUrl: row.pageUrl,
      jobSlug: row.job?.slug ?? null,
      duplicateOfSlug: row.duplicateOfSlug,
      aiCheck: row.aiCheck,
      aiCheckReason: row.aiCheckReason,
      foundAt: row.createdAt.toISOString(),
      job: read ? job : null,
      flags,
      clean: row.state === "CHECK" && Boolean(job) && !row.readError && isClean(flags),
      pdfUrl: row.advertPdfPath ? fileStore.publicUrl("job-adverts", row.advertPdfPath) : null,
    };
  });
}
