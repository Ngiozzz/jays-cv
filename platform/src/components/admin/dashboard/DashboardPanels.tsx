import Link from "next/link";
import { JobLogo } from "@/components/jobs/JobLogo";
import { formatKes, formatNumber } from "@/lib/money";
import type { DashboardData } from "@/modules/dashboard/dashboard.service";
import { deadlineLabel, jobRunway, todayInNairobi } from "@/modules/jobs/jobs.rules";

type Jobs = NonNullable<DashboardData["jobs"]>;
type Business = NonNullable<DashboardData["business"]>;
type Sources = NonNullable<DashboardData["sources"]>;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

// ---------- The month (owner only) ----------

export function MonthStats({
  business,
  delivered,
  inProgress,
}: {
  business: Business;
  delivered: number;
  inProgress: number;
}) {
  return (
    <section aria-labelledby="month-title">
      <div className="owner-note">
        <h2 id="month-title">This month</h2>
        <span>Only you see these</span>
      </div>
      <div className="stats">
        <Link className="stat" href="/admin/finance">
          <span className="stat-l">Takings</span>
          <Money value={business.takings} />
          <span className="stat-c">{plural(business.paidCount, "order")} paid</span>
        </Link>
        <Link className="stat" href="/admin/orders?tab=delivered">
          <span className="stat-l">CVs delivered</span>
          <span className="stat-v key">{delivered}</span>
          <span className="stat-c">{inProgress} being written now</span>
        </Link>
        <Link className="stat" href="/admin/finance">
          <span className="stat-l">Average order</span>
          <Money value={business.average} />
          <span className="stat-c">Across {plural(business.paidCount, "paid order")}</span>
        </Link>
        <Link className="stat" href="/admin/ai">
          <span className="stat-l">AI tokens left</span>
          <span className={business.tokens.low ? "stat-v late" : "stat-v"}>
            {formatNumber(business.tokens.remaining)}
          </span>
          <span className="stat-c">
            {business.postersLeft !== null
              ? `About ${formatNumber(business.postersLeft)} posters`
              : `${business.tokens.percentLeft}% left`}
          </span>
        </Link>
      </div>
    </section>
  );
}

// "KES 17,800" with the currency set small, so the number reads first
function Money({ value }: { value: number }) {
  return (
    <span className="stat-v" aria-label={formatKes(value)}>
      <small>KES</small>
      {value.toLocaleString("en-KE")}
    </span>
  );
}

// ---------- Jobs ----------

export function RecentJobs({ jobs }: { jobs: Jobs }) {
  const today = todayInNairobi();
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recently posted jobs</h2>
        <Link href="/admin/jobs">All jobs</Link>
      </div>
      <ul className="rows">
        {jobs.recent.map((job) => {
          const deadline = deadlineLabel(job.deadline, today);
          const runway = jobRunway(job.deadline, job.postedDay, today);
          return (
            <li key={job.id}>
              <JobLogo company={job.company || job.title} logoUrl={job.logoUrl} />
              <div className="grow">
                <Link className="row-t" href={`/admin/jobs/${job.id}`}>
                  {job.title}
                </Link>
                <span className="row-s">{[job.company, job.location].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="row-r">
                <span className={deadline.tone === "urgent" ? "soon" : undefined}>
                  {job.shownAs === "draft" ? "Draft" : deadline.text}
                </span>
                {job.shownAs === "published" && (
                  <span
                    className={runway.open ? "runway open" : runway.soon ? "runway soon" : "runway"}
                    aria-hidden="true"
                  >
                    {!runway.open && <span style={{ width: `${runway.usedPct}%` }} />}
                  </span>
                )}
              </div>
            </li>
          );
        })}
        {jobs.recent.length === 0 && <li className="empty-note">No jobs yet.</li>}
      </ul>
    </section>
  );
}

export function JobsBoardCard({ jobs, waiting }: { jobs: Jobs; waiting: number }) {
  const rows: [string, number, string][] = [
    ["Live on the website", jobs.live, "/admin/jobs?status=published"],
    ["Closing in 7 days", jobs.closingSoon, "/admin/jobs?status=published"],
    ["Waiting in Bulk post", waiting, "/admin/inbox"],
    ["Drafts", jobs.drafts, "/admin/jobs?status=draft"],
    ["Expired, hidden from the website", jobs.expired, "/admin/jobs?status=expired"],
  ];
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Jobs board</h2>
        <Link href="/admin/inbox">Bulk post</Link>
      </div>
      <ul className="rows tally">
        {rows.map(([label, value, href]) => (
          <li key={label}>
            <Link href={href}>
              <span>{label}</span>
              <b className={value > 0 && label.startsWith("Waiting") ? "gold" : undefined}>{value}</b>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- AI tokens (owner only) ----------

export function AiTokensCard({ business }: { business: Business }) {
  const { tokens, usage } = business;
  return (
    <section className="panel" id="ai-usage">
      <div className="panel-head">
        <h2>AI tokens</h2>
        <Link href="/admin/ai">
          {formatNumber(tokens.remaining)} of {formatNumber(tokens.granted)} left
        </Link>
      </div>
      <div className="panel-body">
        <div className={tokens.low ? "meter low" : "meter"}>
          <span style={{ width: `${tokens.percentLeft}%` }} />
        </div>
        {tokens.low && (
          <p className="meter-note late">
            {tokens.remaining > 0 ? "Running low." : "Out of tokens: AI buttons are paused."}{" "}
            {business.tokenRequest ? (
              "Your request for more is on its way."
            ) : (
              <Link href="/admin/ai">Ask for more</Link>
            )}
          </p>
        )}
      </div>
      {usage.length > 0 ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Used for this month</th>
              <th className="n">Times</th>
              <th className="n">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {usage.slice(0, 4).map((u) => (
              <tr key={u.feature}>
                <td>{u.feature}</td>
                <td className="n">{formatNumber(u.runs)}</td>
                <td className="n">{formatNumber(u.tokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="panel-body hint-sm">No AI used yet this month.</p>
      )}
    </section>
  );
}

// ---------- Job sources ----------

// Jobs the job sources found, waiting in Bulk post, and any source that needs the owner's help
export function SourcesNotice({ sources, manage }: { sources: Sources; manage: boolean }) {
  const waiting = sources.toCheck + sources.toRead;
  const trouble = sources.stopped.length + sources.problems.length;
  if (!sources.sources || (!waiting && !trouble)) return null;
  const jobs = (n: number) => plural(n, "job");
  return (
    <div className="attention calm">
      <span className="dot" aria-hidden="true" />
      <p className="attention-text">
        {waiting > 0 && (
          <b>
            {jobs(waiting)} from your job sources {waiting === 1 ? "is" : "are"} waiting in Bulk post.{" "}
          </b>
        )}
        {[
          sources.foundToday ? `${jobs(sources.foundToday)} found today.` : "",
          sources.toRead ? `${jobs(sources.toRead)} still being read by the AI.` : "",
          sources.stopped.length ? `Stopped: ${sources.stopped.join(", ")}.` : "",
          sources.problems.length ? `Problem on the last check: ${sources.problems.join(", ")}.` : "",
          manage && !sources.morning ? "The morning check is off: switch it on in Job sources." : "",
        ]
          .filter(Boolean)
          .join(" ")}
      </p>
      <div className="attention-acts">
        {manage && (
          <Link className="btn btn-ghost btn-sm" href={trouble ? "/admin/job-sources" : "/admin/job-sources/found"}>
            {trouble ? "Job sources" : "Jobs found"}
          </Link>
        )}
        {waiting > 0 && (
          <Link className="btn btn-primary btn-sm" href="/admin/inbox">
            Open Bulk post
          </Link>
        )}
      </div>
    </div>
  );
}
