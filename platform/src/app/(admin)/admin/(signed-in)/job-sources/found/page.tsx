import type { Metadata } from "next";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { FoundJobsBoard } from "@/components/admin/jobs/FoundJobsBoard";
import { env } from "@/lib/env";
import { loadFoundJobs } from "@/modules/job-sources/found.view";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Jobs found" };

export default async function FoundJobsPage() {
  const member = await requireMember();
  if (!can(member, "manageJobSources")) return <NotAllowed what="the jobs found by your sources" />;
  const jobs = await loadFoundJobs(member);
  return <FoundJobsBoard jobs={jobs} siteUrl={env.APP_URL} />;
}
