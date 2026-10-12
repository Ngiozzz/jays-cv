import type { Metadata } from "next";
import Link from "next/link";
import { JobRowActions } from "@/components/admin/jobs/JobRowActions";
import { JobStatusPill } from "@/components/admin/jobs/JobStatusPill";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { Icon } from "@/components/icons/Icon";
import { JobLogo } from "@/components/jobs/JobLogo";
import { deadlineLabel, postedLabel, todayInNairobi } from "@/modules/jobs/jobs.rules";
import { countByStatus, listJobs, type JobRow } from "@/modules/jobs/jobs.service";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Jobs" };

const TABS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "expired", label: "Expired" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const isTab = (value: unknown): value is TabKey => TABS.some((tab) => tab.key === value);

export default async function JobsPage({ searchParams }: PageProps<"/admin/jobs">) {
  const member = await requireMember();
  if (!can(member, "postJobs")) return <NotAllowed what="jobs" />;

  const params = await searchParams;
  const tab: TabKey = isTab(params.status) ? params.status : "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const jobs = await listJobs(member);
  const counts = countByStatus(jobs);
  const shown = jobs.filter((job) => (tab === "all" || job.shownAs === tab) && matches(job, query));
  const today = todayInNairobi();

  return (
    <>
      {params.deleted && <p className="notice">Job deleted.</p>}
      <section className="panel">
        <div className="table-tools">
          <nav className="tabs" aria-label="Filter by status">
            {TABS.map(({ key, label }) => (
              <Link key={key} href={tabHref(key, query)} aria-current={key === tab ? "page" : undefined}>
                {label}
                <span>{counts[key]}</span>
              </Link>
            ))}
          </nav>
          <form className="table-search" role="search">
            {tab !== "all" && <input type="hidden" name="status" value={tab} />}
            <label className="sr-only" htmlFor="jobs-q">
              Search jobs
            </label>
            <Icon name="search" />
            <input
              type="search"
              id="jobs-q"
              name="q"
              defaultValue={query}
              placeholder="Search title, company, location…"
            />
          </form>
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job</th>
                <th className="col-cat">Category</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Posted</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.length ? (
                shown.map((job) => <JobTableRow key={job.id} job={job} today={today} />)
              ) : (
                <tr>
                  <td colSpan={6} className="table-empty">
                    {jobs.length ? "No jobs match." : "No jobs yet."} <Link href="/admin/jobs/new">Post a job</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function JobTableRow({ job, today }: { job: JobRow; today: string }) {
  const deadline = deadlineLabel(job.deadline, today);
  return (
    <tr>
      <td>
        <div className="cell-job">
          <JobLogo company={job.company || job.title} logoUrl={job.logoUrl} />
          <div>
            <Link href={`/admin/jobs/${job.id}`}>{job.title}</Link>
            <small>{[job.company, job.location].filter(Boolean).join(" · ") || "Details not added yet"}</small>
          </div>
        </div>
      </td>
      <td className="cell-muted col-cat">{job.category || "—"}</td>
      <td>
        <span className={`deadline ${deadline.tone}`}>{deadline.text}</span>
      </td>
      <td>
        <JobStatusPill status={job.shownAs} />
      </td>
      <td className="cell-muted">{job.shownAs === "draft" ? "—" : postedLabel(job.postedDay, today)}</td>
      <td>
        <JobRowActions jobId={job.id} title={job.title} shownAs={job.shownAs} />
      </td>
    </tr>
  );
}

function matches(job: JobRow, query: string): boolean {
  if (!query) return true;
  return `${job.title} ${job.company} ${job.location} ${job.category}`.toLowerCase().includes(query.toLowerCase());
}

function tabHref(tab: TabKey, query: string): string {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("status", tab);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/admin/jobs?${search}` : "/admin/jobs";
}
