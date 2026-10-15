import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobCard } from "@/components/jobs/JobCard";
import { JobDetail } from "@/components/jobs/JobDetail";
import { SectionHead } from "@/components/site/SectionHead";
import { env } from "@/lib/env";
import { whatsappLink } from "@/modules/content/contact";
import { getPriceList } from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { standardDraftHours } from "@/modules/content/pricing";
import { jobPostingSchema, jsonLd } from "@/modules/jobs/job-posting-schema";
import { sharedTags } from "@/modules/jobs/job-tags";
import { getJobBoard, getPublicJob, getPublishedJobSlugs, type PublicJob } from "@/modules/jobs/jobs.public";
import { allTenantSlugs, getTenant } from "@/modules/tenants/tenants.service";
import { siteContext } from "../../site-context";

// Build every published job's page ahead of time; jobs posted later render on first visit, then stay cached.
// The framework needs at least one entry per business, so a business with no jobs yet gets a placeholder
// that simply shows "not found".
const NO_JOBS_YET = "no-jobs-yet";

export async function generateStaticParams() {
  const params: { tenant: string; slug: string }[] = [];
  for (const tenantSlug of await allTenantSlugs()) {
    const tenant = await getTenant(tenantSlug);
    const slugs = await getPublishedJobSlugs(tenant.id);
    for (const slug of slugs.length ? slugs : [NO_JOBS_YET]) params.push({ tenant: tenantSlug, slug });
  }
  return params;
}

export async function generateMetadata({ params }: PageProps<"/[tenant]/jobs/[slug]">): Promise<Metadata> {
  const { tenant: tenantSlug, slug } = await params;
  const { job } = await getPublicJob((await getTenant(tenantSlug)).id, slug);
  if (!job) return { title: "Job not found" };
  return {
    title: `${job.title} at ${job.company}`,
    description: job.summary || `${job.title} job at ${job.company}, ${job.location}. See how to apply.`,
    openGraph: { images: job.posterUrl ? [job.posterUrl] : undefined },
  };
}

export default async function JobPage({ params }: PageProps<"/[tenant]/jobs/[slug]">) {
  const { tenant, settings } = await siteContext(params);
  const { slug } = await params;
  const [{ today, job }, board, prices] = await Promise.all([
    getPublicJob(tenant.id, slug),
    getJobBoard(tenant.id),
    getPriceList(tenant.id),
  ]);
  if (!job) notFound();

  const pageUrl = `${env.APP_URL}/jobs/${job.slug}`;
  const tailoring = prices.services.find((service) => service.needsJobAdvert);
  // Most shared tags first, then the same category, then the newest
  const closeness = (other: PublicJob) => sharedTags(job, other) * 2 + Number(other.category === job.category);
  const similar = board.jobs
    .filter((other) => other.slug !== job.slug)
    .sort((a, b) => closeness(b) - closeness(a))
    .slice(0, 3);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jobPostingSchema(job, pageUrl)) }} />
      <section className="job-page">
        <div className="container">
          <nav className="breadcrumb breadcrumb-left" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/jobs">Find a job</Link>
            <span>/</span>
            <span>{job.title}</span>
          </nav>
          <JobDetail
            job={job}
            today={today}
            pageUrl={pageUrl}
            draftTime={draftTimeLabel(standardDraftHours(prices.packages))}
            check={{ href: `/jobs/${job.slug}/check`, price: settings.cvCheckPrice }}
            tailor={tailoring ? { href: `/order?job=${encodeURIComponent(job.slug)}`, price: tailoring.price } : null}
            cvHelpHref={whatsappLink(
              settings.whatsapp,
              `Hi Jay CVS, I'd like my CV ready for the ${job.title} job at ${job.company}.`,
            )}
            reportHref={whatsappLink(
              settings.whatsapp,
              `Hi Jay CVS, I'd like to report this job advert: ${job.title} at ${job.company}.`,
            )}
          />
        </div>
      </section>

      {similar.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <SectionHead
              eyebrow="More vacancies"
              title="Similar jobs"
              action={
                <Link className="btn btn-ghost" href="/jobs">
                  Browse all jobs
                </Link>
              }
            />
            <div className="job-grid">
              {similar.map((other) => (
                <JobCard
                  key={other.slug}
                  {...other}
                  href={`/jobs/${other.slug}`}
                  applyMethod={other.apply.method}
                  today={board.today}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
