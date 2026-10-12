import type { Metadata } from "next";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { JobEditor } from "@/components/admin/jobs/JobEditor";
import { aiPretendMode } from "@/modules/ai/claude";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { EMPTY_JOB } from "@/modules/jobs/jobs.schema";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const member = await requireMember();
  if (!can(member, "postJobs")) return <NotAllowed what="jobs" />;
  return (
    <JobEditor
      jobId={null}
      initial={EMPTY_JOB}
      status="new"
      today={todayInNairobi()}
      posterUrl={null}
      aiPretend={aiPretendMode}
    />
  );
}
