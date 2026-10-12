import { Icon } from "@/components/icons/Icon";
import { deadlineLabel } from "@/modules/jobs/jobs.rules";
import { JobLogo } from "./JobLogo";

type Props = {
  title: string;
  company: string;
  location: string;
  type: string;
  category: string;
  deadline: string | null;
  today: string;
};

// A job as it appears in the jobs board list (also used for the live preview while posting)
export function JobCard({ title, company, location, type, category, deadline, today }: Props) {
  const closes = deadlineLabel(deadline, today);
  return (
    <article className="job-card">
      <JobLogo company={company || title} />
      <div className="job-main">
        <h3>
          <a>{title || "Job title"}</a>
        </h3>
        <p className="job-company">{company || "Company"}</p>
        <ul className="job-meta">
          <li>
            <Icon name="pin" />
            {location || "Location"}
          </li>
          <li>
            <Icon name="briefcase" />
            {type}
          </li>
        </ul>
        <div className="job-tags">
          {category && <span className="tag">{category}</span>}
          <span className={`deadline ${closes.tone}`}>
            <Icon name="clock" />
            {closes.text}
          </span>
        </div>
      </div>
    </article>
  );
}
