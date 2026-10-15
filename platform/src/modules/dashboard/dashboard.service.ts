import "server-only";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { findLowPendingReviews } from "@/modules/content/admin/reviews.repo";
import { sumUsageByFeature } from "@/modules/ai/tokens.repo";
import { loadFinance } from "@/modules/finance/finance.service";
import { periodStart } from "@/modules/finance/finance.rules";
import { listJobs } from "@/modules/jobs/jobs.service";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { listOrders } from "@/modules/orders/orders.service";
import type { CurrentMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";
import { loadTeam } from "@/modules/team/team.service";
import { jobSummary, myCvs, openOrders, ordersNeedingAttention, progressRows, type Person } from "./dashboard";

// Admin → Dashboard. Each part is loaded only for people allowed to see it (the services check
// again): orders for writers, jobs for job posters, money, team and AI tokens for the owner.

async function ownerSummary(member: CurrentMember, now: Date) {
  const [finance, team, tokens, usage, lowReviews] = await Promise.all([
    loadFinance(member, "month", now),
    loadTeam(member),
    getTokenBalance(member.tenant.id),
    sumUsageByFeature(member.tenant.id, periodStart("month", now)!),
    findLowPendingReviews(member.tenant.id),
  ]);
  const writers = team.members.filter((m) => m.role !== "OWNER");
  const owed = finance.writers.filter((w) => w.owed > 0);
  const posterReading = usage.find((u) => u.feature === "Poster reading");
  return {
    takings: finance.takings,
    paidCount: finance.payments.filter((p) => p.order).length,
    keep: finance.keep,
    owedTotal: owed.reduce((sum, w) => sum + w.owed, 0),
    owedWriters: owed.length,
    activeWriters: writers.filter((m) => m.status === "ACTIVE").length,
    pausedWriters: writers.filter((m) => m.status === "PAUSED").length,
    invitedWriters: team.invites.filter((i) => !i.owner && !i.expired).length,
    tokens,
    usage,
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
  const { orders, writers } = await listOrders(member, now);
  const owner = can(member, "workOnAnyOrder");
  const people: Person[] = owner
    ? writers
        .map((w) => ({ id: w.id, name: w.displayName }))
        // The owner's own row only when they're writing CVs themself
        .filter((p) => p.id !== member.id || orders.some((o) => o.writerId === member.id))
    : [{ id: member.id, name: member.name }];
  return {
    progress: progressRows(orders, people, now),
    mine: myCvs(orders, member.id),
    open: openOrders(orders),
    attention: ordersNeedingAttention(orders, now),
  };
}

async function jobsSummary(member: CurrentMember) {
  return jobSummary(await listJobs(member), todayInNairobi());
}

export async function loadDashboard(member: CurrentMember, now: Date = new Date()) {
  const [business, orders, jobs] = await Promise.all([
    can(member, "manageFinance") ? ownerSummary(member, now) : null,
    can(member, "acceptOrders") ? orderSummary(member, now) : null,
    can(member, "postJobs") ? jobsSummary(member) : null,
  ]);
  return { owner: member.role === "OWNER", business, orders, jobs };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
