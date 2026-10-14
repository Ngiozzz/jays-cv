import "server-only";
import type { PaymentChannel } from "@/generated/prisma/enums";
import { findSettings } from "@/modules/content/content.repo";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan, can } from "@/modules/team/permissions";
import type { ListOrder } from "./orders-list";
import { currentDeadline, dueClock, orderRef, type RuleOrder } from "./orders.rules";
import * as repo from "./orders.repo";
import type { OrderListRecord } from "./orders.repo";

// Admin → Orders. Every writer sees the open orders (to accept them) and who has which, but only
// the owner and the order's own writer see the client's contact details, and only the owner sees money.

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

export async function listOrders(member: CurrentMember, now: Date) {
  assertCan(member, "acceptOrders");
  const tenant = member.tenant;
  const [records, settings, writers, packages] = await Promise.all([
    repo.findOrdersForList(tenant.id),
    findSettings(tenant.id),
    repo.findWriters(tenant.id),
    repo.findPackageNames(tenant.id),
  ]);
  const money = can(member, "seeMoney");
  const orders: ListOrder[] = records.map((order) => {
    const rules = ruleOrderOf(order);
    const payment = order.payments[0];
    return {
      id: order.id,
      ref: orderRef(tenant.orderPrefix, order.number),
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
      due: dueClock(rules, settings, now),
      deadline: currentDeadline(rules, settings),
    };
  });
  return {
    orders,
    money,
    writers,
    packageNames: packages.map((pkg) => pkg.shortName),
  };
}
