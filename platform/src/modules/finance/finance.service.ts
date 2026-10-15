import "server-only";
import { formatKes } from "@/lib/money";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import * as repo from "./finance.repo";
import {
  CHANNEL_LABEL,
  orderNumberLabel,
  owedAmount,
  periodStart,
  summarise,
  toCsv,
  writerShare,
  type Period,
} from "./finance.rules";
import { payoutSchema } from "./finance.schema";

// The Finance screen: the owner only (checked here, on the server). Writers never see money.

export type WriterPayRow = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "REMOVED";
  payPercent: number;
  deliveredInPeriod: number;
  earnedInPeriod: number;
  paidOut: number;
  owed: number;
};

// Per writer: what they earned in the period, and what they've been paid and are owed over all time
async function writerPay(tenantId: string, start: Date | null): Promise<WriterPayRow[]> {
  const [writers, delivered, payouts] = await Promise.all([
    repo.findWriters(tenantId),
    repo.findDeliveredOrders(tenantId),
    repo.sumPayoutsByWriter(tenantId),
  ]);
  const paidOut = new Map(payouts.map((p) => [p.writerId, p._sum.amount ?? 0]));
  return writers
    .map((writer) => {
      const share = (amount: number) => writerShare(amount, writer.payPercent, false);
      const theirs = delivered.filter((order) => order.writerId === writer.id);
      const inPeriod = theirs.filter((order) => !start || (order.deliveredAt !== null && order.deliveredAt >= start));
      const paid = paidOut.get(writer.id) ?? 0;
      return {
        id: writer.id,
        name: writer.displayName,
        status: writer.status,
        payPercent: writer.payPercent,
        deliveredInPeriod: inPeriod.length,
        earnedInPeriod: inPeriod.reduce((sum, order) => sum + share(order.amount), 0),
        paidOut: paid,
        owed: owedAmount(
          theirs.reduce((sum, order) => sum + share(order.amount), 0),
          paid,
        ),
      };
    })
    .filter((row) => row.status !== "REMOVED" || row.owed > 0 || row.paidOut > 0);
}

const totalOf = (sum: { _count: number; _sum: { amount: number | null } }) => ({
  count: sum._count,
  amount: sum._sum.amount ?? 0,
});

// A "Check it yourself" CV check: self-service income with no order behind it
const CV_CHECK = "CV check";

export async function loadFinance(member: CurrentMember, period: Period, now: Date = new Date()) {
  assertCan(member, "manageFinance");
  const tenantId = member.tenant.id;
  const prefix = member.tenant.orderPrefix;
  const start = periodStart(period, now);
  const [payments, writers, unlinked, waiting, abandoned, payouts] = await Promise.all([
    repo.findOrderPayments(tenantId, start),
    writerPay(tenantId, start),
    repo.sumUnlinkedPayments(tenantId, start),
    // Waiting for payment is about right now, whatever period is chosen
    repo.sumUnpaidOrders(tenantId, "NEW", null),
    repo.sumUnpaidOrders(tenantId, "ABANDONED", start),
    repo.findRecentPayouts(tenantId, 10),
  ]);
  const totals = summarise(
    payments.map((p) => ({
      amount: p.amount,
      fee: p.fee,
      itemName: p.order?.itemName ?? (p.cvCheck ? CV_CHECK : "Other"),
    })),
    writers.reduce((sum, w) => sum + w.earnedInPeriod, 0),
  );
  return {
    period,
    ...totals,
    writers,
    payments: payments.map((p) => ({
      id: p.id,
      confirmedAt: (p.confirmedAt ?? now).toISOString(),
      order: p.order ? orderNumberLabel(prefix, p.order.number) : "",
      client: p.order?.clientName ?? "",
      item: p.order?.itemName ?? (p.cvCheck ? `${CV_CHECK}: ${p.cvCheck.jobLabel}` : ""),
      channel: CHANNEL_LABEL[p.channel],
      receipt: p.receipt,
      amount: p.amount,
    })),
    unlinked: totalOf(unlinked),
    waiting: totalOf(waiting),
    abandoned: totalOf(abandoned),
    recentPayouts: payouts.map((p) => ({
      id: p.id,
      writer: p.writer.displayName,
      amount: p.amount,
      reference: p.reference,
      paidAt: p.paidAt.toISOString(),
    })),
  };
}

export type FinanceData = Awaited<ReturnType<typeof loadFinance>>;

export async function recordPayout(
  member: CurrentMember,
  writerId: string,
  raw: unknown,
): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  assertCan(member, "manageFinance");
  const parsed = payoutSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
    };
  }
  const tenantId = member.tenant.id;
  const writer = (await writerPay(tenantId, null)).find((row) => row.id === writerId);
  if (!writer) return { ok: false, fieldErrors: { form: "This writer isn't on the team." } };
  if (parsed.data.amount > writer.owed) {
    return {
      ok: false,
      fieldErrors: { amount: `That's more than ${writer.name} is owed (${formatKes(writer.owed)}).` },
    };
  }
  const reference = parsed.data.reference || null;
  if (reference && (await repo.payoutReferenceUsed(tenantId, reference))) {
    return { ok: false, fieldErrors: { reference: "A payout with this M-Pesa code is already recorded." } };
  }
  await repo.createPayout(tenantId, { writerId: writer.id, amount: parsed.data.amount, reference });
  return { ok: true };
}

// For a payout recorded by mistake: the amount goes back to "Owed now"
export async function undoPayout(
  member: CurrentMember,
  payoutId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  assertCan(member, "manageFinance");
  const { count } = await repo.deletePayout(member.tenant.id, payoutId);
  return count ? { ok: true } : { ok: false, error: "This payout was already removed." };
}

export async function paymentsCsv(member: CurrentMember, period: Period, now: Date = new Date()) {
  assertCan(member, "manageFinance");
  const prefix = member.tenant.orderPrefix;
  const payments = await repo.findOrderPayments(member.tenant.id, periodStart(period, now));
  return toCsv([
    ["Date", "Order", "Client", "Package", "How paid", "M-Pesa code", "Account no.", "Fee (KES)", "Amount (KES)"],
    ...payments.map((p) => [
      p.confirmedAt?.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }),
      p.order ? orderNumberLabel(prefix, p.order.number) : "",
      p.order?.clientName,
      p.order?.itemName ?? (p.cvCheck ? `${CV_CHECK}: ${p.cvCheck.jobLabel}` : ""),
      CHANNEL_LABEL[p.channel],
      p.receipt,
      p.accountReference,
      p.fee,
      p.amount,
    ]),
  ]);
}
