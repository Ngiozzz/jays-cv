import type { Metadata } from "next";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { FoundJobsBoard } from "@/components/admin/jobs/FoundJobsBoard";
import { env } from "@/lib/env";
import { countUnchecked } from "@/modules/job-sources/find-check.service";
import { loadFoundJobs } from "@/modules/job-sources/found.view";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Jobs found" };

export default async function FoundJobsPage({ searchParams }: PageProps<"/admin/job-sources/found">) {
  const member = await requireMember();
  if (!can(member, "manageJobSources")) return <NotAllowed what="the jobs found by your sources" />;
  const [jobs, unchecked, params] = await Promise.all([
    loadFoundJobs(member),
    countUnchecked(member.tenant.id),
    searchParams,
  ]);
  // "See all its jobs" from an opened source on Job sources
  const source = typeof params.source === "string" ? params.source : "";
  return (
    <FoundJobsBoard
      jobs={jobs}
      unchecked={unchecked}
      siteUrl={env.APP_URL}
      today={todayInNairobi()}
      initialSource={source}
    />
  );
}
