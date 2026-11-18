import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { HowToApply } from "@/components/jobs/HowToApply";
import { Breadcrumb } from "@/components/site/PageHero";
import { formatKes } from "@/lib/money";
import { getPriceList } from "@/modules/content/content.service";
import { CHECK_CV_KEEP_HOURS, keptUntilText, matchBand } from "@/modules/cv-check/cv-check";
import { loadCvCheck, type LoadedCvCheck } from "@/modules/cv-check/cv-check.service";
import { getPublicJob } from "@/modules/jobs/jobs.public";
import { applyDeadlineLine, daysUntil } from "@/modules/jobs/jobs.rules";
import { getTenant } from "@/modules/tenants/tenants.service";

// Private to the person who paid for the check: never indexed
export const metadata: Metadata = { title: "Your CV feedback", robots: { index: false, follow: false } };

export default function CvFeedbackPage({ params }: PageProps<"/[tenant]/check/[id]">) {
  return (
    <section className="check-page">
      <div className="container check-narrow">
        <Suspense fallback={<p className="track-meta">Loading your feedback…</p>}>
          <Feedback params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Feedback({ params }: { params: PageProps<"/[tenant]/check/[id]">["params"] }) {
  const { tenant: slug, id } = await params;
  const tenant = await getTenant(slug);
  const [check, prices] = await Promise.all([loadCvCheck(tenant, decodeURIComponent(id)), getPriceList(tenant.id)]);
  if (!check)
    return (
      <div className="card check-card">
        <h1>We couldn&apos;t find this feedback</h1>
        <p>Your feedback can only be opened in the browser you used to check your CV.</p>
        <Link className="btn btn-primary" href="/jobs">
          Browse jobs
        </Link>
      </div>
    );
  const tailoring = prices.services.find((service) => service.needsJobAdvert);
  const feedback = check.status === "DONE" ? check.feedback : null;
  const strongFit = Boolean(feedback?.isCv && matchBand(feedback.matchPercent).tone === "good");
  // A strong fit is sent straight to the employer's own steps, while the job is still open
  const { today, job } = strongFit ? await getPublicJob(tenant.id, check.jobSlug) : { today: "", job: null };
  const canApply = job && (!job.deadline || daysUntil(job.deadline, today) >= 0);
  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: "Find a job", href: "/jobs" },
          { label: check.jobLabel, href: `/jobs/${check.jobSlug}` },
          { label: "Your CV feedback" },
        ]}
      />
      <FeedbackCard check={check} />
      {canApply && (
        <div className="check-apply">
          <div className="check-apply-head">
            <Icon name="check" />
            <div>
              <b>You&apos;re a strong fit: send your application</b>
              <p>
                Your CV already shows what {job.company} is asking for. Apply the way they ask below, before the
                deadline.
              </p>
            </div>
          </div>
          <HowToApply apply={job.apply} jobTitle={job.title} deadlineLine={applyDeadlineLine(job.deadline, today)} />
        </div>
      )}
      {tailoring && check.status === "DONE" && (
        <div className="check-upsell">
          <div>
            <b>{strongFit ? "Want it polished before you apply?" : "Rather we did it for you?"}</b>
            <p>
              A writer tailors your CV to this job, using everything above.
              {check.cvKeptUntil && " Your details and this CV are filled in for you."}
            </p>
          </div>
          <Link
            className="btn btn-light"
            href={`/order?job=${encodeURIComponent(check.jobSlug)}&check=${encodeURIComponent(id)}`}
          >
            Let us tailor it · {formatKes(tailoring.price)}
          </Link>
        </div>
      )}
    </>
  );
}

function FeedbackCard({ check }: { check: LoadedCvCheck }) {
  const feedback = check.feedback;
  if (check.status !== "DONE" || !feedback)
    return (
      <div className="card check-card">
        <h1>Your feedback isn&apos;t ready</h1>
        <p>
          {check.status === "FAILED"
            ? "We couldn't read your CV. Message us on WhatsApp with your M-Pesa code and we'll sort it out."
            : "Go back to the job page and finish paying to see your feedback."}
        </p>
        <Link className="btn btn-ghost" href={`/jobs/${check.jobSlug}`}>
          Back to the job
        </Link>
      </div>
    );
  if (!feedback.isCv)
    return (
      <div className="card check-card">
        <h1>This doesn&apos;t look like a CV</h1>
        <p>
          The file you uploaded doesn&apos;t seem to be a CV, so we couldn&apos;t compare it with {check.jobLabel}.
          Message us on WhatsApp and we&apos;ll help.
        </p>
      </div>
    );
  const band = matchBand(feedback.matchPercent);
  // The ring's arc: a circle of radius 64 is 402 long; the gold part is the match
  const offset = Math.round(402 * (1 - feedback.matchPercent / 100));
  return (
    <div className="feedback">
      <h1>Your CV feedback</h1>
      <p className="for-job">
        <Icon name="briefcase" size={16} />
        <Link className="text-link" href={`/jobs/${check.jobSlug}`}>
          {check.jobLabel}
        </Link>
      </p>
      <section className={`card score match-${band.tone}`}>
        <div className="ring" role="img" aria-label={`Match score ${feedback.matchPercent} out of 100`}>
          <svg viewBox="0 0 148 148" aria-hidden="true">
            <circle cx="74" cy="74" r="64" fill="none" stroke="var(--raised)" strokeWidth="10" />
            <circle
              className="arc"
              cx="74"
              cy="74"
              r="64"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="402"
              style={{ "--off": offset } as CSSProperties}
            />
          </svg>
          <b>
            <span className="num">{feedback.matchPercent}</span>
            <small>out of 100</small>
          </b>
        </div>
        <div>
          <p className="band">{band.label}</p>
          <p className="verdict">{feedback.verdict}</p>
        </div>
      </section>
      <div className="two">
        <section className="card">
          <h2>
            <Icon name="check" size={16} />
            What already fits
          </h2>
          <ul className="fits">
            {feedback.strengths.map((point) => (
              <li key={point}>
                <Icon name="check" size={16} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>
            <Icon name="pen" size={16} />
            What the job asks for that your CV doesn&apos;t show
          </h2>
          <ul className="gaps">
            {feedback.gaps.map((point) => (
              <li key={point}>
                <span className="mk" aria-hidden="true">
                  ?
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {/* The keywords and "what to change first" tips aren't shown: the fixing is what Jay CVS's
          tailoring service is for (the box under this card) */}
      <p className="check-note">
        AI feedback to help you improve your CV. Only add what&apos;s true about you.{" "}
        {check.cvKeptUntil
          ? `Your CV is kept privately for ${CHECK_CV_KEEP_HOURS} hours (until ${keptUntilText(check.cvKeptUntil)}) in case you'd like us to tailor it, then deleted.`
          : "Your CV has been deleted."}
      </p>
    </div>
  );
}
