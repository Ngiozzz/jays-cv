import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CvCheckFlow } from "@/components/cv-check/CvCheckFlow";
import { Icon } from "@/components/icons/Icon";
import { Breadcrumb } from "@/components/site/PageHero";
import { formatKes } from "@/lib/money";
import { getPriceList } from "@/modules/content/content.service";
import { getPublicJob } from "@/modules/jobs/jobs.public";
import { siteContext } from "../../../site-context";
import { generateStaticParams as jobPageParams } from "../page";

// Built ahead of time for the same jobs as the job page itself
export async function generateStaticParams() {
  return jobPageParams();
}

export const metadata: Metadata = {
  title: "Check your CV for this job",
  robots: { index: false, follow: true },
};

// "Check it yourself": quick AI feedback on how well a CV fits this job, for clients who'd rather
// improve their CV themselves. Feedback only; a writer tailoring it is the separate "Let us tailor it".
export default async function CvCheckPage({ params }: PageProps<"/[tenant]/jobs/[slug]/check">) {
  const { tenant, settings } = await siteContext(params);
  const { slug } = await params;
  const [{ job }, prices] = await Promise.all([getPublicJob(tenant.id, slug), getPriceList(tenant.id)]);
  if (!job) notFound();
  const tailoring = prices.services.find((service) => service.needsJobAdvert);
  const jobLabel = `${job.title} at ${job.company}`;

  return (
    <section className="section check-page">
      <div className="container check-wrap">
        <Breadcrumb
          left
          crumbs={[
            { label: "Find a job", href: "/jobs" },
            { label: job.title, href: `/jobs/${job.slug}` },
            { label: "Check my CV" },
          ]}
        />
        <div className="check-card">
          <span className="cv-cta-eyebrow">Check it yourself · {formatKes(settings.cvCheckPrice)}</span>
          <h1>How well does your CV fit this job?</h1>
          <p className="check-job">
            <Icon name="briefcase" />
            {jobLabel}
          </p>
          <ul className="check-gets">
            <li>Your match for this job, out of 100</li>
            <li>What already fits, and what the job asks for that your CV doesn&apos;t show</li>
            <li>The keywords recruiters look for, and what to change first</li>
          </ul>
          <p className="check-note">You get feedback to improve your CV yourself. We don&apos;t rewrite it.</p>
          <CvCheckFlow
            jobSlug={job.slug}
            jobLabel={jobLabel}
            price={settings.cvCheckPrice}
            businessName={tenant.name}
          />
        </div>
        {tailoring && (
          <p className="check-alt">
            Rather we did it for you?{" "}
            <Link href={`/order?job=${encodeURIComponent(job.slug)}`}>
              Let us tailor it · {formatKes(tailoring.price)}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
