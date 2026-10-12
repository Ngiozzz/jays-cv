import type { JobDisplayStatus } from "@/modules/jobs/jobs.rules";

const LABEL: Record<JobDisplayStatus | "new", string> = {
  published: "Published",
  draft: "Draft",
  expired: "Expired",
  new: "New",
};

export function JobStatusPill({ status }: { status: JobDisplayStatus | "new" }) {
  return <span className={`status status-${status === "new" ? "draft" : status}`}>{LABEL[status]}</span>;
}
