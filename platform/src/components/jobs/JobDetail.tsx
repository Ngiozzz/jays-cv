import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/icons/Icon";
import { StageTrack } from "@/components/site/StageTrack";
import { formatKes } from "@/lib/money";
import type { PublicJob } from "@/modules/jobs/jobs.public";
import { applyDeadlineLine, daysLeftText, deadlineLabel, formatDay, postedLabel } from "@/modules/jobs/jobs.rules";
import { tagSlug } from "@/modules/jobs/jobs.schema";
import { HowToApply } from "./HowToApply";
import { JobLogo } from "./JobLogo";
import { JobDeadline } from "./JobRow";

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
  const shareHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <>
      <section className="job-top">
        <div className="container rise">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/jobs">Find a job</Link>
            <span>/</span>
            <span>{job.title}</span>
          </nav>
          <div className="job-title">
            <JobLogo company={job.company} logoUrl={job.logoUrl} />
            <div>
              {job.category && <div className="cat">{job.category}</div>}
              <h1>{job.title}</h1>
              <p className="co">{job.company}</p>
            </div>
            <a className="btn btn-ghost btn-sm share-top" href={shareHref} target="_blank" rel="noopener">
              <Icon name="share" size={16} />
              Share
            </a>
          </div>
          {closed && (
            <p className="job-closed">
              <Icon name="info" size={16} />
              This job closed on {job.deadline && formatDay(job.deadline)}.<Link href="/jobs">See open jobs</Link>
            </p>
          )}
          <dl className="job-facts">
            <div>
              <dt>
                <Icon name="pin" size={16} />
                Location
              </dt>
              <dd>
                {job.location}
                <small>{job.workMode}</small>
              </dd>
            </div>
            <div>
              <dt>
                <Icon name="briefcase" size={16} />
                Job type
              </dt>
              <dd>
                {job.type}
                <small>Posted {postedLabel(job.postedDay, today).toLowerCase()}</small>
              </dd>
            </div>
            <div>
              <dt>
                <Icon name="clock" size={16} />
                Deadline
              </dt>
              <dd className={closes.tone === "urgent" ? "soon" : undefined}>
                {job.deadline ? formatDay(job.deadline) : "Open until filled"}
                <JobDeadline deadline={job.deadline} postedDay={job.postedDay} today={today} />
                {job.deadline && <small>{daysLeftText(job.deadline, today)}</small>}
              </dd>
            </div>
            <div>
              <dt>
                <Icon name="cash" size={16} />
                Salary
              </dt>
              <dd>
                {job.salary || "Not stated"}
                <small>{job.salary ? "As on the advert" : "Ask at interview"}</small>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="container">
        <div className="job-layout">
          <article className="advert">
            {job.summary && (
              <>
                <h2>About the role</h2>
                <p>{job.summary}</p>
              </>
            )}
            {job.responsibilities.length > 0 && (
              <>
                <h2>What you&apos;ll do</h2>
                <ul className="dots">
                  {job.responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            {job.requirements.length > 0 && (
              <>
                <h2>What they&apos;re asking for</h2>
                <ul className="reqs">
                  {job.requirements.map((item) => (
                    <li key={item}>
                      <Icon name="check" size={16} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {check && !closed && (
                  <p className="reqs-note">
                    Does your CV show these?{" "}
                    <Link className="text-link" href={check.href}>
                      Check it against this job
                    </Link>
                  </p>
                )}
              </>
            )}
            {job.tags.length > 0 && (
              <nav className="job-tags" aria-label="Similar jobs by tag">
                <span>More jobs like this</span>
                {job.tags.map((tag) => (
                  <Link key={tag} className="chip" href={`/jobs/tag/${tagSlug(tag)}`}>
                    {tag}
                  </Link>
                ))}
              </nav>
            )}

            {!closed && <HowToApply apply={job.apply} jobTitle={job.title} deadlineLine={deadlineLine} />}

            {job.posterUrl && (
              <section className="job-poster">
                <h2>Original advert</h2>
                <figure>
                  <img
                    src={job.posterUrl}
                    alt={`Original job advert for ${job.title} at ${job.company}`}
                    loading="lazy"
                  />
                  <figcaption>As it was shared{job.source ? ` · ${job.source}` : ""}</figcaption>
                </figure>
              </section>
            )}

            {job.advertPdfUrl && (
              <p className="job-advert-pdf">
                <a className="text-link" href={job.advertPdfUrl} target="_blank" rel="noopener noreferrer" download>
                  Download the original advert (PDF)
                </a>
              </p>
            )}

            <p className="job-source">
              Checked and posted by our team {postedLabel(job.postedDay, today).toLowerCase()}
              {job.source ? ` · Source: ${job.source}` : ""}
            </p>
          </article>

          <aside className="job-aside">
            <div className="ready">
              <p className="k">Before you apply</p>
              <h3>Is your CV ready for this job?</h3>
              {check && (
                <Link className="opt" href={check.href}>
                  <b>Check it yourself</b>
                  <span className="p">{formatKes(check.price)}</span>
                  <p>
                    Upload your CV and get a match score out of 100, what already fits, and what this advert asks for
                    that your CV doesn&apos;t show.
                  </p>
                </Link>
              )}
              {tailor && (
                <Link className="opt" href={tailor.href}>
                  <b>Let us tailor it</b>
                  <span className="p">{formatKes(tailor.price)}</span>
                  <p>A writer rewrites your CV for this advert. First draft within {draftTime}.</p>
                  <StageTrack of={5} at={2} />
                </Link>
              )}
              {!check && !tailor && (
                <a className="btn btn-light btn-block" href={cvHelpHref} target="_blank" rel="noopener">
                  Get my CV ready
                </a>
              )}
              <a className="ask" href={cvHelpHref} target="_blank" rel="noopener">
                Questions first? Ask us on WhatsApp
              </a>
            </div>
            <div className="card side-card">
              <h3>Share this job</h3>
              <p>Know someone it suits? Send it on.</p>
              <div className="share">
                <a className="btn btn-ghost btn-sm" href={shareHref} target="_blank" rel="noopener">
                  <Icon name="chat" size={16} />
                  WhatsApp
                </a>
                <CopyButton text={pageUrl} label="Copy link" className="btn btn-ghost btn-sm" />
              </div>
            </div>
            <div className="card side-card">
              <h3>Stay safe</h3>
              <p>
                Never pay anyone to get a job or an interview. Genuine employers don&apos;t charge application fees.
              </p>
              <a className="text-link report" href={reportHref} target="_blank" rel="noopener">
                Report this advert
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
