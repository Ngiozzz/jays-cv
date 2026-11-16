import type { Metadata } from "next";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { JobSourcesBoard } from "@/components/admin/jobs/JobSourcesBoard";
import { DAILY_LIMIT, MAX_FAILURES } from "@/modules/job-sources/job-sources.service";
import { loadJobSources } from "@/modules/job-sources/job-sources.admin";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Job sources" };

export default async function JobSourcesPage() {
  const member = await requireMember();
  if (!can(member, "manageJobSources")) return <NotAllowed what="job sources" />;
  const data = await loadJobSources(member);
  return <JobSourcesBoard data={data} dailyLimit={DAILY_LIMIT} maxFailures={MAX_FAILURES} />;
}
