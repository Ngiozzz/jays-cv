import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import { jobDraftSchema } from "@/modules/jobs/jobs.schema";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";

// "Jobs found": every job the job sources have found lately, and what became of it

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
  foundAt: string;
};

// The last month of finds is shown
const SHOW_DAYS = 30;

export async function loadFoundJobs(member: CurrentMember): Promise<FoundJob[]> {
  assertCan(member, "manageJobSources");
  const rows = await tenantDb(member.tenant.id).inboxItem.findMany({
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
      createdAt: true,
      job: { select: { slug: true } },
    },
  });
  return rows.map((row) => {
    const parsed = row.reading ? jobDraftSchema.safeParse(row.reading) : null;
    const job = parsed?.success ? parsed.data : null;
    const read = row.state !== "READING";
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
      foundAt: row.createdAt.toISOString(),
    };
  });
}
