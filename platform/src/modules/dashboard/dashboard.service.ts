import "server-only";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { findLowPendingReviews } from "@/modules/content/admin/reviews.repo";
import { sumUsageByFeature } from "@/modules/ai/tokens.repo";
import { findOpenRequest } from "@/modules/ai/token-requests.repo";
import { loadFinance } from "@/modules/finance/finance.service";
import { periodStart } from "@/modules/finance/finance.rules";
import { sourcesDashboard } from "@/modules/job-sources/job-sources.repo";
import { startOfNairobiDay } from "@/modules/job-sources/morning.service";
import { listJobs } from "@/modules/jobs/jobs.service";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { listOrders } from "@/modules/orders/orders.service";
import type { CurrentMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";
import { loadTeam } from "@/modules/team/team.service";
import { deliveredSince, jobSummary, openOrders, orderBoard } from "./dashboard";

// Admin → Dashboard. Each part is loaded only for people allowed to see it (the services check
// again): orders for writers, jobs for job posters, money, team and AI tokens for the owner.

async function ownerSummary(member: CurrentMember, now: Date) {
  const [finance, team, tokens, usage, lowReviews, tokenRequest] = await Promise.all([
    loadFinance(member, "month", now),
    loadTeam(member),
    getTokenBalance(member.tenant.id),
    sumUsageByFeature(member.tenant.id, periodStart("month", now)!),
    findLowPendingReviews(member.tenant.id),
    findOpenRequest(member.tenant.id),
  ]);
  const writers = team.members.filter((m) => m.role !== "OWNER");
  const posterReading = usage.find((u) => u.feature === "Poster reading");
  return {
    takings: finance.takings,
    paidCount: finance.payments.filter((p) => p.order).length,
    average: finance.average,
    keep: finance.keep,
    activeWriters: writers.filter((m) => m.status === "ACTIVE").length,
    pausedWriters: writers.filter((m) => m.status === "PAUSED").length,
    invitedWriters: team.invites.filter((i) => !i.owner && !i.expired).length,
    tokens,
    usage,
    // More tokens asked for and not yet added by the platform owner
    tokenRequest,
    // Unhappy clients to call before word gets around (owner only; cleared once the review is dealt with)
    lowReviews: lowReviews.map((review) => ({
      id: review.id,
      ref: review.order ? `${member.tenant.orderPrefix}-${review.order.number}` : null,
      rating: review.rating,
      text: review.text,
      name: review.name,
    })),
    // How many more posters the balance reads, going by this month's average
    postersLeft:
      posterReading && posterReading.runs > 0
        ? Math.floor(tokens.remaining / (posterReading.tokens / posterReading.runs))
        : null,
  };
}

async function orderSummary(member: CurrentMember, now: Date) {
  const { orders } = await listOrders(member, now);
  return {
    open: openOrders(orders),
    board: orderBoard(orders, now),
    // Everything the viewer can see that's being worked on right now
    inProgress: orders.filter((order) => ["WRITING", "DRAFT_SENT", "REVISIONS"].includes(order.status)).length,
    deliveredThisMonth: deliveredSince(orders, periodStart("month", now)!),
    // First names of the writers with a CV on their desk, for the board's heading
    writersWriting: [
      ...new Set(
        orders
          .filter((order) => order.writerName && ["WRITING", "REVISIONS"].includes(order.status))
          .map((order) => order.writerName!.split(" ")[0]),
      ),
    ],
  };
}

async function jobsSummary(member: CurrentMember) {
  return jobSummary(await listJobs(member), todayInNairobi());
}

export async function loadDashboard(member: CurrentMember, now: Date = new Date()) {
  const [business, orders, jobs, sources] = await Promise.all([
    can(member, "manageFinance") ? ownerSummary(member, now) : null,
    can(member, "acceptOrders") ? orderSummary(member, now) : null,
    can(member, "postJobs") ? jobsSummary(member) : null,
    // Jobs the job sources found (anyone who posts jobs checks them); which sources need help (owners)
    can(member, "postJobs") ? sourcesDashboard(member.tenant.id, startOfNairobiDay(now)) : null,
  ]);
  return {
    owner: member.role === "OWNER",
    business,
    orders,
    jobs,
    sources: sources && {
      ...sources,
      stopped: can(member, "manageJobSources") ? sources.stopped : [],
      problems: can(member, "manageJobSources") ? sources.problems : [],
    },
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
