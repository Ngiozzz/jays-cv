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
    <section className="check-page">
      <div className="container">
        <Breadcrumb
          crumbs={[
            { label: "Find a job", href: "/jobs" },
            { label: job.title, href: `/jobs/${job.slug}` },
            { label: "Check my CV" },
          ]}
        />
        <div className="check-grid">
          <div>
            <h1>How well does your CV fit this job?</h1>
            <p className="for-job">
              <Icon name="briefcase" size={16} />
              <Link className="text-link" href={`/jobs/${job.slug}`}>
                {jobLabel}
              </Link>
            </p>
            <CvCheckFlow
              jobSlug={job.slug}
              jobLabel={jobLabel}
              price={settings.cvCheckPrice}
              businessName={tenant.name}
            />
          </div>
          <aside className="check-side">
            <div className="card">
              <h3>What you get</h3>
              {/* Only what the feedback page actually shows */}
              <ul className="gets">
                <li>
                  <Icon name="target" size={16} />
                  Your match for this job, out of 100
                </li>
                <li>
                  <Icon name="check" size={16} />
                  What already fits
                </li>
                <li>
                  <Icon name="pen" size={16} />
                  What the job asks for that your CV doesn&apos;t show
                </li>
              </ul>
              <div className="price-line">
                <span className="soft">One check</span>
                <b className="num">{formatKes(settings.cvCheckPrice)}</b>
              </div>
              <p className="note">Feedback to improve your CV yourself. We don&apos;t rewrite it.</p>
            </div>
            {tailoring && (
              <div className="card check-alt">
                <h3>Rather we did it for you?</h3>
                <p>
                  A writer tailors your CV to this advert.{" "}
                  <Link className="text-link" href={`/order?job=${encodeURIComponent(job.slug)}`}>
                    Let us tailor it · {formatKes(tailoring.price)}
                  </Link>
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
