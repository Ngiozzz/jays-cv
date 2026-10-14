import type { Metadata } from "next";
import Link from "next/link";
import { BusinessCards } from "@/components/admin/dashboard/BusinessCards";
import {
  AiUsagePanel,
  AttentionPanel,
  ClosingSoon,
  JobStats,
  OpenOrdersPanel,
  QuickPost,
  RecentJobs,
} from "@/components/admin/dashboard/DashboardPanels";
import { ProgressPanel, type ProgressCv } from "@/components/admin/dashboard/ProgressPanel";
import { Icon } from "@/components/icons/Icon";
import { greeting, isOpenOrder, waitingFor } from "@/modules/dashboard/dashboard";
import { loadDashboard } from "@/modules/dashboard/dashboard.service";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Dashboard" };

// Owner: the month's money, the team's progress, every order needing attention, jobs and AI tokens.
// Writer: their own CVs, orders they can accept, and jobs if they post them. Never any money.
export default async function DashboardPage() {
  const member = await requireMember();
  const now = new Date();
  const { owner, business, orders, jobs } = await loadDashboard(member, now);
  const firstName = member.name.split(" ")[0];
  const open = orders?.open ?? [];

  const mine: ProgressCv[] = (orders?.mine ?? []).map((order) => ({
    ref: order.ref,
    clientName: order.clientName,
    itemName: order.packageName ?? order.itemName,
    stage: order.status as ProgressCv["stage"],
    due: order.due,
  }));
  const attention = orders && (
    <AttentionPanel
      orders={orders.attention.map((order) => ({ order, open: isOpenOrder(order), waiting: waitingFor(order, now) }))}
    />
  );

  return (
    <>
      <div className="welcome">
        <div>
          <h2>
            {greeting(now)}, {firstName} 👋
          </h2>
          <p>{owner ? "Here's your business today: money, team and orders." : "Here's your work today."}</p>
        </div>
        {can(member, "postJobs") && (
          <Link className="btn btn-primary" href="/admin/jobs/new">
            <Icon name="plus" size={18} />
            Post a job
          </Link>
        )}
      </div>

      {business && <BusinessCards business={business} notAccepted={open.length} />}
      {orders && !owner && <OpenOrdersPanel open={open.map((order) => ({ order, waiting: waitingFor(order, now) }))} />}
      {jobs && <JobStats jobs={jobs} />}

      {orders && (
        <ProgressPanel
          owner={owner}
          me={member.id}
          rows={orders.progress}
          mine={mine}
          // A writer already has "Orders you can accept" just above
          open={
            owner && open.length
              ? {
                  count: open.length,
                  oldestRef: open[0].ref,
                  oldestWaiting: waitingFor(open[0], now),
                  refs: open.map((order) => `${order.ref} (${waitingFor(order, now)})`).join(", "),
                }
              : null
          }
        />
      )}

      {jobs ? (
        <div className="dash-grid">
          <div>
            <QuickPost />
            <RecentJobs jobs={jobs} />
          </div>
          <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
            <ClosingSoon jobs={jobs} today={todayInNairobi(now)} />
            {attention}
            {business && <AiUsagePanel business={business} />}
          </div>
        </div>
      ) : (
        // No job panels (a writer who doesn't post jobs): the orders list takes the full width
        attention
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
