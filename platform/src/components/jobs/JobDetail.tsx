import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/icons/Icon";
import { formatKes } from "@/lib/money";
import type { PublicJob } from "@/modules/jobs/jobs.public";
import { applyDeadlineLine, daysLeftText, deadlineLabel, formatDay, postedLabel } from "@/modules/jobs/jobs.rules";
import { tagSlug } from "@/modules/jobs/jobs.schema";
import { HowToApply } from "./HowToApply";
import { JobLogo } from "./JobLogo";

type Props = {
  job: PublicJob;
  today: string;
  pageUrl: string;
  draftTime: string;
  cvHelpHref: string;
  // The two ways to get a CV ready for this job: AI feedback to fix it yourself, or a writer tailors it
  // (null when the business doesn't offer that one)
  check: { href: string; price: number } | null;
  tailor: { href: string; price: number } | null;
  reportHref: string;
};

export function JobDetail({ job, today, pageUrl, draftTime, cvHelpHref, check, tailor, reportHref }: Props) {
  const closes = deadlineLabel(job.deadline, today);
  const closed = closes.tone === "closed";
  const deadlineLine = applyDeadlineLine(job.deadline, today);
  const shareText = `${job.title} at ${job.company}. Apply by ${job.deadline ? formatDay(job.deadline) : "soon"}: ${pageUrl}`;

  return (
    <>
      {closed && (
        <div className="job-closed">
          <Icon name="info" />
          This job has closed. <Link href="/jobs">See open jobs →</Link>
        </div>
      )}
      <div className="job-layout">
        <article className="job-article">
          <header className="job-header card">
            <JobLogo company={job.company} logoUrl={job.logoUrl} />
            <div>
              {job.category && <span className="tag">{job.category}</span>}
              <h1>{job.title}</h1>
              <p className="job-company">{job.company}</p>
            </div>
            <dl className="job-facts">
              <Fact icon="pin" label="Location" value={`${job.location} · ${job.workMode}`} />
              <Fact icon="briefcase" label="Job type" value={job.type} />
              <div>
                <dt>
                  <Icon name="clock" />
                  Deadline
                </dt>
                <dd className={`deadline ${closes.tone}`}>
                  {job.deadline ? (
                    <>
                      {formatDay(job.deadline)}
                      <small>{daysLeftText(job.deadline, today)}</small>
                    </>
                  ) : (
                    closes.text
                  )}
                </dd>
              </div>
              {job.salary && <Fact icon="cash" label="Salary" value={job.salary} />}
            </dl>
          </header>

          <div className="job-body card">
            {job.summary && (
              <>
                <h2>About the role</h2>
                <p>{job.summary}</p>
              </>
            )}
            <JobList title="Responsibilities" items={job.responsibilities} />
            <JobList title="Requirements" items={job.requirements} />
            {job.tags.length > 0 && (
              <nav className="job-tags" aria-label="Similar jobs by tag">
                <span>More jobs like this:</span>
                {job.tags.map((tag) => (
                  <Link key={tag} className="tag" href={`/jobs/tag/${tagSlug(tag)}`}>
                    {tag}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          <HowToApply apply={job.apply} jobTitle={job.title} deadlineLine={deadlineLine} />

          {job.posterUrl && (
            <section className="card job-poster">
              <h2>Original advert</h2>
              <img
                src={job.posterUrl}
                alt={`Original job advert poster for ${job.title} at ${job.company}`}
                loading="lazy"
              />
            </section>
          )}

          <p className="job-source">
            {job.source ? `Source: ${job.source} · ` : ""}Posted {postedLabel(job.postedDay, today).toLowerCase()}
          </p>
        </article>

        <aside className="job-aside">
          <div className="cv-cta">
            <span className="cv-cta-eyebrow">Before you apply</span>
            <h3>Is your CV ready for this job?</h3>
            {check || tailor ? (
              <>
                {check && (
                  <div className="cv-choice">
                    <Link className="btn btn-light btn-block" href={check.href}>
                      <Icon name="search" />
                      Check it yourself · {formatKes(check.price)}
                    </Link>
                    <small>Instant AI feedback: how well you match, and what to fix</small>
                  </div>
                )}
                {tailor && (
                  <div className="cv-choice">
                    <Link className="btn btn-outline-light btn-block" href={tailor.href}>
                      <Icon name="edit" />
                      Let us tailor it · {formatKes(tailor.price)}
                    </Link>
                    <small>Our writer rewrites your CV for this job, draft in {draftTime}</small>
                  </div>
                )}
                <a className="cv-cta-link" href={cvHelpHref} target="_blank" rel="noopener">
                  Questions first? Ask us on WhatsApp →
                </a>
              </>
            ) : (
              <a className="btn btn-light btn-block" href={cvHelpHref} target="_blank" rel="noopener">
                <Icon name="whatsapp" />
                Get my CV ready
              </a>
            )}
            <Link className="cv-cta-link" href="/pricing">
              See packages &amp; prices →
            </Link>
          </div>
          <div className="card aside-card">
            <h3>Share this job</h3>
            <div className="share-row">
              <a
                className="btn btn-ghost btn-sm"
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener"
              >
                <Icon name="whatsapp" />
                WhatsApp
              </a>
              <CopyButton text={pageUrl} label="Copy link" className="btn btn-ghost btn-sm" />
            </div>
          </div>
          <div className="card aside-card safety">
            <h3>
              <Icon name="shield" />
              Stay safe
            </h3>
            <p>Never pay anyone to get a job or an interview. Genuine employers don&apos;t charge application fees.</p>
            <a href={reportHref} target="_blank" rel="noopener">
              Report this advert
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}

function Fact({ icon, label, value }: { icon: "pin" | "briefcase" | "cash"; label: string; value: string }) {
  return (
    <div>
      <dt>
        <Icon name={icon} />
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function JobList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <>
      <h2>{title}</h2>
      <ul className="job-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}
