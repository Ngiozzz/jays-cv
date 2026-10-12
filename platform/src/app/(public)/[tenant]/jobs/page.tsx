import type { Metadata } from "next";
import { Suspense } from "react";
import { JobsBrowser, JobsBrowserFromLink } from "@/components/jobs/JobsBrowser";
import { CtaBand } from "@/components/site/CtaBand";
import { getPriceList } from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { standardDraftHours } from "@/modules/content/pricing";
import { toBoardListing } from "@/modules/jobs/board-filter";
import { getJobBoard } from "@/modules/jobs/jobs.public";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "Find a Job in Kenya",
  description:
    "Latest job vacancies in Kenya, shared daily by Jay CVS. Search by keyword, location and category, and see exactly how to apply.",
};

export default async function JobsPage({ params }: PageProps<"/[tenant]/jobs">) {
  const { tenant, settings, freeReviewHref } = await siteContext(params);
  const [{ today, jobs }, prices] = await Promise.all([getJobBoard(tenant.id), getPriceList(tenant.id)]);

  const board = {
    jobs: jobs.map(toBoardListing),
    today,
    channelLink: settings.channelLink,
    draftTime: draftTimeLabel(standardDraftHours(prices.packages)),
  };

  return (
    <>
      {/* The plain list is what search engines and slow phones see first */}
      <Suspense fallback={<JobsBrowser {...board} />}>
        <JobsBrowserFromLink {...board} />
      </Suspense>
      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
