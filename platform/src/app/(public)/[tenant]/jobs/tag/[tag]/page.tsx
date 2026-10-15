import type { Metadata } from "next";
import Link from "next/link";
import { JobCard } from "@/components/jobs/JobCard";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { allTagSlugs, jobsWithTag, tagName } from "@/modules/jobs/job-tags";
import { getJobBoard } from "@/modules/jobs/jobs.public";
import { allTenantSlugs, getTenant } from "@/modules/tenants/tenants.service";
import { siteContext } from "../../../site-context";

// One page per search tag ("CPA jobs in Kenya" at /jobs/tag/cpa), so people searching Google for a
// profession, town or level can land on Jay CVS. Built ahead for every tag in use; new tags render
// on first visit. A business with no tags yet gets a placeholder that shows an empty page.
const NO_TAGS_YET = "no-tags-yet";

export async function generateStaticParams() {
  const params: { tenant: string; tag: string }[] = [];
  for (const tenantSlug of await allTenantSlugs()) {
    const { jobs } = await getJobBoard((await getTenant(tenantSlug)).id);
    const tags = allTagSlugs(jobs);
    for (const tag of tags.length ? tags : [NO_TAGS_YET]) params.push({ tenant: tenantSlug, tag });
  }
  return params;
}

export async function generateMetadata({ params }: PageProps<"/[tenant]/jobs/tag/[tag]">): Promise<Metadata> {
  const { tenant: tenantSlug, tag } = await params;
  const { jobs } = await getJobBoard((await getTenant(tenantSlug)).id);
  const tagged = jobsWithTag(jobs, tag);
  const name = tagName(jobs, tag);
  return {
    title: `${name} jobs in Kenya`,
    description: `${tagged.length || "No"} open ${name} job${tagged.length === 1 ? "" : "s"} in Kenya, shared by Jay CVS. See the details and exactly how to apply.`,
    // An empty tag page has nothing for Google to show
    robots: tagged.length ? undefined : { index: false, follow: true },
  };
}

export default async function TagPage({ params }: PageProps<"/[tenant]/jobs/tag/[tag]">) {
  const { tenant, freeReviewHref } = await siteContext(params);
  const { tag } = await params;
  const { today, jobs } = await getJobBoard(tenant.id);
  const tagged = jobsWithTag(jobs, tag);
  const name = tagName(jobs, tag);

  return (
    <>
      <PageHero
        crumbs={[{ label: "Find a job", href: "/jobs" }, { label: `${name} jobs` }]}
        title={`${name} jobs in Kenya`}
        lead={
          tagged.length
            ? `${tagged.length} open ${tagged.length === 1 ? "job" : "jobs"}, newest first. Each one shows exactly how to apply.`
            : `No open ${name} jobs right now. New jobs are added every day.`
        }
      />
      <section className="section">
        <div className="container">
          {tagged.length ? (
            <div className="job-grid">
              {tagged.map((job) => (
                <JobCard
                  key={job.slug}
                  {...job}
                  href={`/jobs/${job.slug}`}
                  applyMethod={job.apply.method}
                  today={today}
                />
              ))}
            </div>
          ) : null}
          <p style={{ marginTop: 24 }}>
            <Link className="btn btn-ghost" href="/jobs">
              Browse all jobs
            </Link>
          </p>
        </div>
      </section>
      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
