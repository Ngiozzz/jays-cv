import "server-only";
import { env } from "@/lib/env";
import { formatKes } from "@/lib/money";
import { findSettings } from "@/modules/content/content.repo";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan, can } from "@/modules/team/permissions";
import type { CurrentTenant } from "@/modules/tenants/tenants.service";
import { nextStep } from "./next-step";
import { teamActor, teamEventText } from "./order-events";
import { groupFiles } from "./order-files";
import { currentDeadline, dueClock, orderRef, roundsLabel, STATUS_TEXT, type RuleOrder } from "./orders.rules";
import * as repo from "./orders.repo";
import type { OrderDetailRecord } from "./orders.repo";
import { PAY_CHANNEL } from "./orders.service";
import { parseOrderNumber } from "./tracking";
import { openTrackingToken } from "./tracking-token";

// Admin → one order. Everyone who takes orders can read it; only the owner and the order's own
// writer can work on it, see the client's contact details, files and tracking link; only the owner
// sees money.

export const canWorkOn = (member: CurrentMember, order: { writerId: string | null }) =>
  can(member, "workOnAnyOrder") || (order.writerId !== null && order.writerId === member.id);

export const ruleOrderOf = (order: OrderDetailRecord): RuleOrder => ({
  ...order,
  revisions: order.revisions.map((revision) => revision.requestedAt),
});

// The website address clients use: the business's own domain once it has one
export const siteUrl = (tenant: CurrentTenant) => (tenant.domain ? `https://${tenant.domain}` : env.APP_URL);

export async function loadOrderForTeam(member: CurrentMember, ref: string, now: Date) {
  assertCan(member, "acceptOrders");
  const tenant = member.tenant;
  const number = parseOrderNumber(ref, tenant.orderPrefix);
  const order = number === null ? null : await repo.findOrderDetail(tenant.id, number);
  if (!order) return null;

  const [settings, writers] = await Promise.all([findSettings(tenant.id), repo.findWriters(tenant.id)]);
  const money = can(member, "seeMoney");
  const owner = can(member, "reassignOrders");
  const works = canWorkOn(member, order);
  const rules = ruleOrderOf(order);
  const orderNo = orderRef(tenant.orderPrefix, order.number);
  const payment = order.payments[0] ?? null;
  const token =
    works && order.trackingTokenSealed ? openTrackingToken(order.trackingTokenSealed, env.BETTER_AUTH_SECRET) : null;
  const ownership = order.events.find((event) => event.kind === "accepted" || event.kind === "reassigned");
  const lastChange = order.revisions.at(-1) ?? null;

  return {
    id: order.id,
    ref: orderNo,
    status: order.status,
    statusText: STATUS_TEXT[order.status].team,
    statusTone: STATUS_TEXT[order.status].tone,
    due: dueClock(rules, settings, now),
    itemName: order.itemName,
    amount: money ? order.amount : null,
    createdAt: order.createdAt,
    source: order.source,
    brief: {
      targetRole: order.targetRole,
      industry: order.industry,
      experience: order.experience,
      notes: order.notes,
      noCv: order.noCv,
    },
    revisions: order.revisions.length,
    lastChange: lastChange && { text: lastChange.text, by: lastChange.requestedBy },
    roundsLabel: roundsLabel(rules),
    next: nextStep({
      status: order.status,
      ref: orderNo,
      writerName: order.writer?.displayName ?? null,
      paybill: settings.paybill,
      amount: money ? formatKes(order.amount) : null,
      roundsLabel: roundsLabel(rules),
      timings: settings,
    }),
    // What this viewer may do
    you: {
      id: member.id,
      name: member.name,
      works,
      owner,
      money,
      canAccept: order.status === "PAID" && !order.writerId,
      canExtend: owner && currentDeadline(rules, settings) !== null,
      canRecordPayment: can(member, "recordPayments") && (order.status === "NEW" || order.status === "ABANDONED"),
    },
    payment: {
      paid: order.paidAt !== null,
      paybill: settings.paybill,
      // Owner only
      details:
        money && payment
          ? {
              channel: PAY_CHANNEL[payment.channel],
              receipt: payment.receipt,
              amount: payment.amount,
              account: payment.accountReference ?? orderNo,
            }
          : null,
    },
    writer: order.writer
      ? {
          id: order.writerId!,
          name: order.writer.displayName,
          isYou: order.writerId === member.id,
          how: ownership?.kind === "reassigned" ? "Assigned to" : "Accepted by",
          at: (ownership?.at ?? order.acceptedAt)?.toISOString() ?? null,
        }
      : null,
    waitingSince: order.paidAt?.toISOString() ?? null,
    // Owner only: who the order can be moved to
    writers: owner ? writers.filter((writer) => writer.id !== order.writerId) : [],
    client: works
      ? { name: order.clientName, phone: order.clientPhone, email: order.clientEmail }
      : { name: order.clientName, phone: null, email: null },
    trackingUrl: token ? `${siteUrl(tenant)}/t/${token}` : null,
    files: groupFiles(order.files),
    // The client's own files hold their details: only the order's writer and the owner open them
    canOpenClientFiles: works,
    events: order.events.map((event) => {
      const view = { ...event, actorName: event.actor?.displayName ?? null };
      return {
        who: teamActor(view),
        text: teamEventText(view, money),
        at: event.at.toISOString(),
        client: event.visibleToClient,
        tone:
          event.actorType === "SYSTEM" || event.actorType === "MPESA"
            ? "sys"
            : event.actorType === "CLIENT"
              ? "client"
              : "",
      };
    }),
  };
}

export type TeamOrder = NonNullable<Awaited<ReturnType<typeof loadOrderForTeam>>>;
