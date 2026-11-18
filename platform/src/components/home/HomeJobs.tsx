import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { JobRow } from "@/components/jobs/JobRow";
import { SectionHead } from "@/components/site/SectionHead";
import type { BoardListing } from "@/modules/jobs/board-filter";

const POPULAR = [
  { label: "IT and tech", category: "IT & Tech" },
  { label: "Healthcare", category: "Healthcare" },
  { label: "NGO", category: "NGO & Development" },
  { label: "Finance", category: "Finance & Accounting" },
  { label: "Sales", category: "Sales & Marketing" },
  { label: "Hospitality", category: "Hospitality" },
];

type Props = { latest: BoardListing[]; openCount: number; today: string; channelLink: string | null };

// Homepage jobs: a search box, the six newest open jobs as rows with their deadline runway, and the channel
export function HomeJobs({ latest, openCount, today, channelLink }: Props) {
  return (
    <section className="section jobs-home" id="jobs">
      <div className="container">
        <SectionHead
          title="Jobs open this week"
          action={
            <Link className="link" href="/jobs">
              Browse all jobs <Icon name="arrow" size={16} />
            </Link>
          }
        >
          <p>
            Vacancies from across Kenya, checked and posted by our team every day.{" "}
            <span className="num">{openCount}</span> {openCount === 1 ? "is" : "are"} open right now.
          </p>
        </SectionHead>

        <form className="job-search" action="/jobs" method="get" role="search">
          <label className="field">
            <Icon name="search" />
            <span className="sr-only">Search jobs</span>
            <input type="search" name="q" placeholder="Job title, company or town" />
          </label>
          <button className="btn btn-primary btn-lg" type="submit">
            Search jobs
          </button>
        </form>
        <div className="quick-cats">
          <span>Popular</span>
          {POPULAR.map((item) => (
            <Link key={item.category} href={`/jobs?cat=${encodeURIComponent(item.category)}`}>
              {item.label}
            </Link>
          ))}
        </div>

        {latest.length > 0 && (
          <div className="job-list">
            {latest.map((job) => (
              <JobRow key={job.slug} {...job} href={`/jobs/${job.slug}`} today={today} />
            ))}
          </div>
        )}

        {channelLink && (
          <div className="channel-row">
            <p>
              <b>New jobs on WhatsApp every day.</b> Follow the {`Jay CVS Job Vacancies`} channel and see them first.
            </p>
            <a className="btn btn-ghost btn-sm" href={channelLink} target="_blank" rel="noopener">
              Follow the channel
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
