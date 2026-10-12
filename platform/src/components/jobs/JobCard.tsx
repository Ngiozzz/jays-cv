import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { deadlineLabel, postedLabel } from "@/modules/jobs/jobs.rules";
import type { ApplyMethod } from "@/modules/jobs/jobs.schema";
import { JobLogo } from "./JobLogo";

export const APPLY_LABEL: Record<ApplyMethod, { icon: IconName; text: string }> = {
  email: { icon: "mail", text: "Apply by email" },
  link: { icon: "link", text: "Apply online" },
  whatsapp: { icon: "whatsapp", text: "Apply via WhatsApp" },
  "in-person": { icon: "pin", text: "Apply in person" },
  other: { icon: "doc", text: "See how to apply" },
};

type Props = {
  title: string;
  company: string;
  location: string;
  type: string;
  category: string;
  deadline: string | null;
  today: string;
  // Only on the public board (the admin's live preview has no page to link to yet)
  href?: string;
  salary?: string | null;
  applyMethod?: ApplyMethod;
  postedDay?: string;
  logoUrl?: string | null;
};

// A job as it appears in the jobs board list (also the live preview while posting a job)
export function JobCard(props: Props) {
  const { title, company, location, type, category, deadline, today, href, salary, applyMethod, postedDay, logoUrl } =
    props;
  const closes = deadlineLabel(deadline, today);
  const apply = applyMethod ? APPLY_LABEL[applyMethod] : null;
  const closesTag = (
    <span className={`deadline ${closes.tone}`}>
      <Icon name="clock" />
      {closes.text}
    </span>
  );
  return (
    <article className="job-card">
      <JobLogo company={company || title} logoUrl={logoUrl} />
      <div className="job-main">
        <h3>{href ? <Link href={href}>{title}</Link> : <a>{title || "Job title"}</a>}</h3>
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
          {salary && (
            <li>
              <Icon name="cash" />
              {salary}
            </li>
          )}
        </ul>
        <div className="job-tags">
          {category && <span className="tag">{category}</span>}
          {apply ? (
            <span className="apply-tag">
              <Icon name={apply.icon} />
              {apply.text}
            </span>
          ) : (
            closesTag
          )}
        </div>
      </div>
      {postedDay && (
        <div className="job-side">
          {closesTag}
          <span className="posted">Posted {postedLabel(postedDay, today).toLowerCase()}</span>
        </div>
      )}
    </article>
  );
}
