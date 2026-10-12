import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { JobEditor } from "@/components/admin/jobs/JobEditor";
import { PublishedNotice } from "@/components/admin/jobs/PublishedNotice";
import { env } from "@/lib/env";
import { displayStatus, todayInNairobi } from "@/modules/jobs/jobs.rules";
import { getJob, toJobInput } from "@/modules/jobs/jobs.service";
import { channelPost } from "@/modules/jobs/jobs.share";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Edit job" };

export default async function EditJobPage({ params, searchParams }: PageProps<"/admin/jobs/[id]">) {
  const member = await requireMember();
  if (!can(member, "postJobs")) return <NotAllowed what="jobs" />;

  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const job = await getJob(member, id);
  if (!job) notFound();

  const input = toJobInput(job);
  const today = todayInNairobi();
  const status = displayStatus({ status: job.status, deadline: input.deadline }, today);
  const links = { job: `${env.APP_URL}/jobs/${job.slug}`, services: `${env.APP_URL}/services` };

  return (
    <>
      {saved === "published" && <PublishedNotice channelPost={channelPost(input, links)} />}
      {saved === "draft" && <p className="notice">Saved as a draft. It isn&apos;t on the website yet.</p>}
      {/* key: a fresh form after each save, so it shows exactly what was stored */}
      <JobEditor key={job.updatedAt.toISOString()} jobId={job.id} initial={input} status={status} today={today} />
    </>
  );
}
