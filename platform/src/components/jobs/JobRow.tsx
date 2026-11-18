import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { daysUntil, formatDay, jobRunway } from "@/modules/jobs/jobs.rules";
import { JobLogo } from "./JobLogo";

type Props = {
  href: string;
  title: string;
  company: string;
  location: string;
  type: string;
  category: string;
  deadline: string | null;
  postedDay: string;
  today: string;
  salary?: string | null;
  logoUrl?: string | null;
};

// The deadline as a short runway bar and a line of text, e.g. "3 days left · 21 Nov"
export function JobDeadline({ deadline, postedDay, today }: Pick<Props, "deadline" | "postedDay" | "today">) {
  const runway = jobRunway(deadline, postedDay, today);
  if (runway.open || !deadline) {
    return (
      <div className="job-deadline">
        <div className="runway open" />
        Open until filled
      </div>
    );
  }
  const left = daysUntil(deadline, today);
  const text = runway.closed
    ? `Closed ${formatDay(deadline)}`
    : `${left === 0 ? "Closes today" : left === 1 ? "1 day left" : `${left} days left`} · ${formatDay(deadline)}`;
  return (
    <div className={runway.soon ? "job-deadline soon num" : "job-deadline num"}>
      <div className={runway.soon ? "runway soon" : "runway"}>
        <span style={{ width: `${runway.usedPct}%` }} />
      </div>
      {text}
    </div>
  );
}

// One job in a list: the employer, where and what, and how long is left to apply
export function JobRow(props: Props) {
  const { href, title, company, location, type, category, deadline, postedDay, today, salary, logoUrl } = props;
  const isNew = postedDay === today;
  return (
    <Link className="job-row" href={href}>
      <JobLogo company={company || title} logoUrl={logoUrl} />
      <div className="job-row-main">
        <h3>
          {title}
          {isNew && <span className="job-new">New today</span>}
        </h3>
        <p className="job-row-co">
          {company} · {location}
        </p>
        <p className="job-row-meta">
          <span>{type}</span>
          {category && <span>{category}</span>}
          {salary && <span className="pay">{salary}</span>}
        </p>
      </div>
      <JobDeadline deadline={deadline} postedDay={postedDay} today={today} />
      <Icon name="chevron" className="job-row-go" />
    </Link>
  );
}
