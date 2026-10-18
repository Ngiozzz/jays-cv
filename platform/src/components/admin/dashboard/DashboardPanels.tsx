import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { JobLogo } from "@/components/jobs/JobLogo";
import { JobStatusPill } from "@/components/admin/jobs/JobStatusPill";
import { formatNumber } from "@/lib/money";
import type { DashboardData } from "@/modules/dashboard/dashboard.service";
import { deadlineLabel } from "@/modules/jobs/jobs.rules";
import type { ListOrder } from "@/modules/orders/orders-list";
import { STATUS_TEXT } from "@/modules/orders/orders.rules";
import { OpenTokenRequest, RequestTokensButton } from "./TokenRequest";

type Jobs = NonNullable<DashboardData["jobs"]>;
type Business = NonNullable<DashboardData["business"]>;

const orderLine = (order: ListOrder) => `${order.packageName ?? order.itemName} · ${STATUS_TEXT[order.status].team}`;

// ---------- Orders ----------

// A writer's list of paid orders waiting for someone to take them
export function OpenOrdersPanel({ open }: { open: { order: ListOrder; waiting: string }[] }) {
  return (
    <section className="panel open-panel">
      <div className="panel-head">
        <div>
          <h2>Orders you can accept</h2>
          <p className="panel-sub">Paid and waiting. The first writer to accept gets the order.</p>
        </div>
      </div>
      <div className="panel-body">
        <ul className="mini-list">
          {open.length ? (
            open.map(({ order, waiting }) => (
              <li key={order.id} className="is-open">
                <div className="mini-main">
                  <Link href={`/admin/orders/${order.ref}`}>
                    {order.ref} · {order.packageName ?? order.itemName}
                  </Link>
                  <small>Waiting {waiting}</small>
                </div>
                <Link className="btn btn-primary btn-sm" href={`/admin/orders/${order.ref}`}>
                  Open &amp; accept
                </Link>
              </li>
            ))
          ) : (
            <li className="empty-note">Nothing waiting right now. New paid orders show up here.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

export function AttentionPanel({ orders }: { orders: { order: ListOrder; open: boolean; waiting: string }[] }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Orders needing attention</h2>
        <Link href="/admin/orders?quick=action">All orders →</Link>
      </div>
      <div className="panel-body">
        <ul className="mini-list">
          {orders.length ? (
            orders.map(({ order, open, waiting }) => (
              <li key={order.id} className={open ? "is-open" : undefined}>
                <div className="mini-main">
                  <Link href={`/admin/orders/${order.ref}`}>
                    {order.ref} · {order.clientName}
                  </Link>
                  <small>{orderLine(order)}</small>
                </div>
                {open ? (
                  <span className="flag critical">⚠ Not accepted · {waiting}</span>
                ) : (
                  <span className={`due ${order.due.tone}`}>{order.due.text.replace(/ ·.*/, "")}</span>
                )}
              </li>
            ))
          ) : (
            <li className="empty-note">All caught up. No orders need action.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

// ---------- Jobs ----------

export function JobStats({ jobs }: { jobs: Jobs }) {
  return (
    <div className="stat-grid">
      <Link className="stat-card" href="/admin/jobs?status=published" style={{ textDecoration: "none" }}>
        <span className="icon-box">
          <Icon name="globe" />
        </span>
        <div>
          <strong>{jobs.live}</strong>
          <span>Live on the website</span>
        </div>
      </Link>
      <div className="stat-card warn">
        <span className="icon-box">
          <Icon name="clock" />
        </span>
        <div>
          <strong>{jobs.closingSoon}</strong>
          <span>Closing in 7 days</span>
        </div>
      </div>
      <Link className="stat-card muted" href="/admin/jobs?status=draft" style={{ textDecoration: "none" }}>
        <span className="icon-box">
          <Icon name="edit" />
        </span>
        <div>
          <strong>{jobs.drafts}</strong>
          <span>Drafts</span>
        </div>
      </Link>
      <Link className="stat-card red" href="/admin/jobs?status=expired" style={{ textDecoration: "none" }}>
        <span className="icon-box">
          <Icon name="eye-off" />
        </span>
        <div>
          <strong>{jobs.expired}</strong>
          <span>Expired (auto-hidden)</span>
        </div>
      </Link>
    </div>
  );
}

export function QuickPost() {
  return (
    <div className="quick-post">
      <span className="icon-box" style={{ background: "rgba(230,200,119,.15)", color: "var(--gold)", margin: 0 }}>
        <Icon name="image" />
      </span>
      <div>
        <h3>Got a new job poster?</h3>
        <p>
          Drop today&apos;s posters in Bulk post jobs. AI reads them, flags scams and duplicates, and you approve each
          one in seconds.
        </p>
      </div>
      <Link className="btn btn-light" href="/admin/inbox">
        Open Bulk post jobs
      </Link>
    </div>
  );
}

type JobItem = Jobs["recent"][number];

function JobLine({ job, children }: { job: JobItem; children: React.ReactNode }) {
  return (
    <li>
      <JobLogo company={job.company || job.title} logoUrl={job.logoUrl} />
      <div className="mini-main">
        <Link href={`/admin/jobs/${job.id}`}>{job.title}</Link>
        <small>{[job.company, job.location].filter(Boolean).join(" · ")}</small>
      </div>
      {children}
    </li>
  );
}

export function RecentJobs({ jobs }: { jobs: Jobs }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recently posted</h2>
        <Link href="/admin/jobs">All jobs →</Link>
      </div>
      <div className="panel-body">
        <ul className="mini-list">
          {jobs.recent.length ? (
            jobs.recent.map((job) => (
              <JobLine key={job.id} job={job}>
                <JobStatusPill status={job.shownAs} />
              </JobLine>
            ))
          ) : (
            <li className="empty-note">No jobs yet.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

export function ClosingSoon({ jobs, today }: { jobs: Jobs; today: string }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Closing soon</h2>
        <Link href="/admin/jobs?status=published">View →</Link>
      </div>
      <div className="panel-body">
        <ul className="mini-list">
          {jobs.closingList.length ? (
            jobs.closingList.map((job) => {
              const deadline = deadlineLabel(job.deadline, today);
              return (
                <JobLine key={job.id} job={job}>
                  <span className={`deadline ${deadline.tone}`}>{deadline.text}</span>
                </JobLine>
              );
            })
          ) : (
            <li className="empty-note">No published jobs close in the next 7 days.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

// ---------- AI tokens (owner only) ----------

export function AiUsagePanel({ business }: { business: Business }) {
  const { tokens, usage } = business;
  const used = usage.reduce((sum, u) => sum + u.tokens, 0);
  return (
    <section className="panel" id="ai-usage">
      <div className="panel-head">
        <h2>
          <Icon name="sparkle" className="h-icon" />
          AI tokens
        </h2>
        {!business.tokenRequest && <RequestTokensButton />}
      </div>
      <div className="panel-body">
        <div className="ai-total">
          <div>
            <strong>{formatNumber(tokens.remaining)}</strong>
            <span>tokens left</span>
          </div>
          {business.postersLeft !== null && (
            <div>
              <strong>≈ {formatNumber(business.postersLeft)}</strong>
              <span>posters&apos; worth</span>
            </div>
          )}
        </div>
        <div className={tokens.low ? "budget low" : "budget"}>
          <div className="budget-bar">
            <span style={{ width: `${tokens.percentLeft}%` }}></span>
          </div>
          <small>
            {tokens.percentLeft}% left of {formatNumber(tokens.granted)} tokens · {formatNumber(used)} used this month
          </small>
        </div>
        {tokens.low && (
          <p className="ai-low">
            <Icon name="alert" />
            <span>
              {tokens.remaining > 0 ? "Running low." : "Out of tokens: AI buttons are paused."}{" "}
              {business.tokenRequest ? "Your request for more is on its way." : "Use Request tokens to ask for more."}
            </span>
          </p>
        )}
        {business.tokenRequest && (
          <OpenTokenRequest
            id={business.tokenRequest.id}
            tokens={business.tokenRequest.tokens}
            note={business.tokenRequest.note}
            createdAt={business.tokenRequest.createdAt}
          />
        )}
        {usage.length > 0 ? (
          <table className="ai-table">
            <thead>
              <tr>
                <th>Used for (this month)</th>
                <th>Times</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.feature}>
                  <td>{u.feature}</td>
                  <td>{formatNumber(u.runs)}</td>
                  <td>{formatNumber(u.tokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="hint-sm">No AI used yet this month.</p>
        )}
      </div>
    </section>
  );
}
