import type { Metadata } from "next";
import Link from "next/link";
import {
  AiTokensCard,
  JobsBoardCard,
  MonthStats,
  RecentJobs,
  SourcesNotice,
} from "@/components/admin/dashboard/DashboardPanels";
import { OrderBoard } from "@/components/admin/dashboard/OrderBoard";
import { Icon } from "@/components/icons/Icon";
import { greeting, waitingFor } from "@/modules/dashboard/dashboard";
import { loadDashboard } from "@/modules/dashboard/dashboard.service";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Dashboard" };

// Owner: the one thing that needs them now, the month's numbers, the order board, jobs and AI tokens.
// Writer: the order board (orders they can accept, and their own) and jobs if they post them. Never money.
export default async function DashboardPage() {
  const member = await requireMember();
  const now = new Date();
  const { owner, business, orders, jobs, sources } = await loadDashboard(member, now);
  const firstName = member.name.split(" ")[0];
  const open = orders?.open ?? [];
  const oldest = open[0];

  return (
    <>
      <div className="page-bar dash-head">
        <div>
          <h1>
            {greeting(now)}, {firstName}
          </h1>
          <p>
            {owner
              ? `Orders, writers and money at ${member.tenant.name} this month.`
              : orders
                ? "Orders you can take, and the CVs you're writing."
                : "Jobs on the website."}
          </p>
        </div>
        <div className="page-actions">
          {orders && (
            <Link className="btn btn-ghost" href="/admin/orders">
              All orders
            </Link>
          )}
          {can(member, "postJobs") && (
            <Link className="btn btn-primary" href="/admin/jobs/new">
              <Icon name="plus" />
              Post a job
            </Link>
          )}
        </div>
      </div>

      {oldest && (
        <div className="attention" role="alert">
          <span className="dot" aria-hidden="true" />
          <p className="attention-text">
            <span className="ref">{oldest.ref}</span> · <b>{oldest.clientName}</b> paid for{" "}
            {oldest.packageName ?? oldest.itemName} but no writer has accepted it. Waiting {waitingFor(oldest, now)}.
            {open.length > 1 &&
              ` ${open.length - 1} more paid ${open.length === 2 ? "order is" : "orders are"} waiting too.`}
          </p>
          <div className="attention-acts">
            {open.length > 1 && (
              <Link className="btn btn-ghost btn-sm" href="/admin/orders?tab=open">
                See all {open.length}
              </Link>
            )}
            <Link className="btn btn-primary btn-sm" href={`/admin/orders/${oldest.ref}`}>
              {owner ? "Assign a writer" : "Open and accept"}
            </Link>
          </div>
        </div>
      )}

      {business && business.lowReviews.length > 0 && (
        <div className="attention" role="alert">
          <span className="dot" aria-hidden="true" />
          <div className="attention-text">
            <b>
              {business.lowReviews.length === 1
                ? "A client is unhappy."
                : `${business.lowReviews.length} clients are unhappy.`}
            </b>{" "}
            Call them to put it right. This clears once you approve or hide the review.
            <ul>
              {business.lowReviews.map((review) => (
                <li key={review.id}>
                  {review.ref && <Link href={`/admin/orders/${review.ref}`}>{review.ref}</Link>} {review.name} gave{" "}
                  {review.rating} of 5: &ldquo;{review.text}&rdquo;
                </li>
              ))}
            </ul>
          </div>
          <div className="attention-acts">
            <Link className="btn btn-ghost btn-sm" href="/admin/content?tab=reviews">
              Open reviews
            </Link>
          </div>
        </div>
      )}

      {sources && <SourcesNotice sources={sources} manage={can(member, "manageJobSources")} />}

      {business && orders && (
        <MonthStats business={business} delivered={orders.deliveredThisMonth} inProgress={orders.inProgress} />
      )}

      {orders && <OrderBoard columns={orders.board} now={now} writing={orders.writersWriting} />}

      {(jobs || business) && (
        <div className="dash-grid">
          {jobs ? <RecentJobs jobs={jobs} /> : <div />}
          <div className="dash-side">
            {jobs && <JobsBoardCard jobs={jobs} waiting={sources ? sources.toCheck + sources.toRead : 0} />}
            {business && <AiTokensCard business={business} />}
          </div>
        </div>
      )}

      {!orders && !jobs && (
        <section className="panel">
          <div className="panel-body">
            <p className="empty-note">
              Your account can&apos;t take orders or post jobs yet. Ask {owner ? "your developer" : "the owner"} to
              switch them on in Team.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
