import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { JobCard } from "@/components/jobs/JobCard";
import type { BoardListing } from "@/modules/jobs/board-filter";

const POPULAR = [
  { label: "IT & Tech", category: "IT & Tech" },
  { label: "Healthcare", category: "Healthcare" },
  { label: "NGO", category: "NGO & Development" },
  { label: "Finance", category: "Finance & Accounting" },
  { label: "Sales", category: "Sales & Marketing" },
  { label: "Hospitality", category: "Hospitality" },
];

type Props = { latest: BoardListing[]; openCount: number; today: string; channelLink: string | null };

// Homepage "Find your next job": the six newest open jobs, a search box and the WhatsApp channel
export function HomeJobs({ latest, openCount, today, channelLink }: Props) {
  return (
    <section className="section jobs-home" id="jobs">
      <div className="container">
        <div className="section-head section-head-row">
          <div>
            <p className="eyebrow">
              <span className="dot"></span> Updated daily
            </p>
            <h2>Find your next job</h2>
            <p className="jobs-home-sub">
              Fresh vacancies from across Kenya, shared by our team every day.{" "}
              <strong>
                {openCount} {openCount === 1 ? "job" : "jobs"} open
              </strong>{" "}
              right now.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/jobs">
            Browse all jobs
          </Link>
        </div>

        <form className="job-search job-search-home" action="/jobs" method="get" role="search">
          <label className="job-search-field">
            <Icon name="search" />
            <span className="sr-only">Search jobs</span>
            <input type="search" name="q" placeholder="Job title, company or keyword" />
          </label>
          <button className="btn btn-primary" type="submit">
            Search jobs
          </button>
        </form>
        <div className="quick-cats">
          <span>Popular:</span>
          {POPULAR.map((item) => (
            <Link key={item.category} href={`/jobs?cat=${encodeURIComponent(item.category)}`}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="job-grid">
          {latest.map((job) => (
            <JobCard key={job.slug} {...job} href={`/jobs/${job.slug}`} today={today} />
          ))}
        </div>

        {channelLink && (
          <div className="channel-banner">
            <span className="channel-icon">
              <Icon name="whatsapp" />
            </span>
            <div>
              <strong>Get new jobs on WhatsApp every day</strong>
              <p>
                Join 57,000+ job seekers following the <em>Jay CVS Job Vacancies</em> channel.
              </p>
            </div>
            <a className="btn btn-wa" href={channelLink} target="_blank" rel="noopener">
              Follow the channel
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
