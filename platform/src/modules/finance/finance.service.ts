import "server-only";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import * as repo from "./finance.repo";
import { CHANNEL_LABEL, orderNumberLabel, periodStart, summarise, toCsv, type Period } from "./finance.rules";

// The Finance screen: the owner only (checked here, on the server). Writers never see money.
// Writers are on a monthly salary, paid outside the app, so nothing here is per CV.

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
  const [payments, unlinked, waiting, abandoned] = await Promise.all([
    repo.findOrderPayments(tenantId, start),
    repo.sumUnlinkedPayments(tenantId, start),
    // Waiting for payment is about right now, whatever period is chosen
    repo.sumUnpaidOrders(tenantId, "NEW", null),
    repo.sumUnpaidOrders(tenantId, "ABANDONED", start),
  ]);
  const totals = summarise(
    payments.map((p) => ({
      amount: p.amount,
      fee: p.fee,
      itemName: p.order?.itemName ?? (p.cvCheck ? CV_CHECK : "Other"),
    })),
  );
  return {
    period,
    ...totals,
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
  };
}

export type FinanceData = Awaited<ReturnType<typeof loadFinance>>;

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
