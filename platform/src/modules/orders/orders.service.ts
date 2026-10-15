import "server-only";
import type { PaymentChannel } from "@/generated/prisma/enums";
import { findSettings } from "@/modules/content/content.repo";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan, can } from "@/modules/team/permissions";
import { deliveredOrderBy, deliveredWhere, PAGE_SIZE, type Viewer } from "./orders-history";
import { countTabs, filterOrders, quickCounts, type ListOrder, type OrderFilters } from "./orders-list";
import { currentDeadline, DAY, dueClock, orderRef, type OrderTimings, type RuleOrder } from "./orders.rules";
import { upkeepBeforeTeamView } from "./order-upkeep.service";
import * as repo from "./orders.repo";
import type { OrderListRecord } from "./orders.repo";

// Admin → Orders. Every writer sees the open orders (to accept them) and who has which, but only
// the owner and the order's own writer see the client's contact details, and only the owner sees money.
// Unfinished orders are few and loaded whole; delivered ones are filtered and paged by the database.

export const PAY_CHANNEL: Record<PaymentChannel, string> = {
  MPESA_STK: "M-Pesa prompt",
  MPESA_PAYBILL: "Paybill",
  MANUAL: "Recorded by hand",
};

export const seesClient = (member: CurrentMember, order: { writerId: string | null }) =>
  can(member, "workOnAnyOrder") || (order.writerId !== null && order.writerId === member.id);

export const ruleOrderOf = (order: OrderListRecord): RuleOrder => ({
  ...order,
  revisions: order.revisions.map((revision) => revision.requestedAt),
});

const UNFINISHED = { status: { not: "DELIVERED" as const } };

function toListOrder(member: CurrentMember, order: OrderListRecord, timings: OrderTimings, now: Date): ListOrder {
  const rules = ruleOrderOf(order);
  const money = can(member, "seeMoney");
  const payment = order.payments[0];
  return {
    id: order.id,
    ref: orderRef(member.tenant.orderPrefix, order.number),
    status: order.status,
    itemName: order.itemName,
    packageName: order.package?.shortName ?? null,
    amount: money ? order.amount : null,
    clientName: order.clientName,
    clientPhone: seesClient(member, order) ? order.clientPhone : null,
    writerId: order.writerId,
    writerName: order.writer?.displayName ?? null,
    paid: order.paidAt !== null,
    payChannel: payment ? PAY_CHANNEL[payment.channel] : order.paidAt ? "Paid" : null,
    receipt: money ? (payment?.receipt ?? null) : null,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    deliveredAt: order.deliveredAt,
    due: dueClock(rules, timings, now),
    deadline: currentDeadline(rules, timings),
  };
}

// Statuses are brought up to date (and old unpaid orders deleted) before anything is read
async function prepare(member: CurrentMember, now: Date) {
  assertCan(member, "acceptOrders");
  const settings = await findSettings(member.tenant.id);
  await upkeepBeforeTeamView(member.tenant.id, settings, now);
  return settings;
}

// The Dashboard: every unfinished order, plus those delivered in the last 30 days
export async function listOrders(member: CurrentMember, now: Date) {
  const settings = await prepare(member, now);
  const tenantId = member.tenant.id;
  const [records, writers] = await Promise.all([
    repo.findOrdersForList(tenantId, {
      OR: [UNFINISHED, { status: "DELIVERED", deliveredAt: { gte: new Date(now.getTime() - 30 * DAY) } }],
    }),
    repo.findWriters(tenantId),
  ]);
  return { orders: records.map((order) => toListOrder(member, order, settings, now)), writers };
}

// Admin → Orders: one page of the current view, with the numbers on the tabs and the quick cards
export async function listOrderPage(member: CurrentMember, now: Date, filters: OrderFilters, page: number) {
  const settings = await prepare(member, now);
  const tenantId = member.tenant.id;
  const viewer: Viewer = {
    memberId: member.id,
    orderPrefix: member.tenant.orderPrefix,
    money: can(member, "seeMoney"),
    allPhones: can(member, "workOnAnyOrder"),
  };
  const delivered = deliveredWhere(filters, viewer, now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Every delivered order up to the end of this page, so the merged list is in the right order
  const [
    unfinished,
    deliveredRecords,
    deliveredMatches,
    deliveredAll,
    deliveredMine,
    deliveredPaid,
    writers,
    packages,
  ] = await Promise.all([
    repo.findOrdersForList(tenantId, UNFINISHED),
    delivered
      ? repo.findOrdersForList(tenantId, delivered, {
          orderBy: deliveredOrderBy(filters.sort),
          take: page * PAGE_SIZE,
        })
      : [],
    delivered ? repo.countOrders(tenantId, delivered) : 0,
    repo.countOrders(tenantId, { status: "DELIVERED" }),
    repo.countOrders(tenantId, { status: "DELIVERED", writerId: member.id }),
    viewer.money ? repo.sumDeliveredPaidSince(tenantId, monthStart) : 0,
    repo.findWriters(tenantId),
    repo.findPackageNames(tenantId),
  ]);

  const working = unfinished.map((order) => toListOrder(member, order, settings, now));
  const shownWorking = filterOrders(working, filters, member.id, now);
  const merged = filterOrders(
    [...working, ...deliveredRecords.map((order) => toListOrder(member, order, settings, now))],
    filters,
    member.id,
    now,
  );

  // Tab and card numbers: unfinished orders counted here, delivered ones by the database
  const tabs = countTabs(working, member.id);
  tabs.all += deliveredAll;
  tabs.delivered = deliveredAll;
  tabs.mine += deliveredMine;
  const quick = quickCounts(working, now);

  return {
    orders: merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: shownWorking.length + deliveredMatches,
    tabs,
    quick: { ...quick, paidAmount: quick.paidAmount + deliveredPaid },
    money: viewer.money,
    writers,
    packageNames: packages.map((pkg) => pkg.shortName),
  };
}
