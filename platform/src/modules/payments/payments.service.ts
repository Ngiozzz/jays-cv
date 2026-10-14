import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { tenantDb } from "@/lib/tenant-db";
import { hasTrackingPass } from "@/modules/orders/tracking-pass";
import { parseOrderNumber } from "@/modules/orders/tracking";
import type { CurrentTenant } from "@/modules/tenants/tenants.service";
import { mpesa } from "./gateway";
import {
  accountNumber,
  amountDue,
  localPhone,
  mpesaPhone,
  PROMPT_RESULT,
  PROMPT_SECONDS,
  pretendReceipt,
  type PretendOutcome,
  type PromptOutcome,
} from "./mpesa";

// The client paying for their order from the website. Only a browser holding the order's tracking
// pass (given when the order is placed, or by the tracking link) can start or check a payment.

type Refused = { ok: false; error: string };
const refuse = (error: string): Refused => ({ ok: false, error });
const TX = { maxWait: 10_000, timeout: 20_000 };
// A client can't fire prompt after prompt at a phone
const PROMPT_LIMIT = { count: 5, minutes: 10 };
const UNPAID = ["NEW", "ABANDONED"] as const;

async function payableOrder(tenant: CurrentTenant, ref: string) {
  const number = parseOrderNumber(ref, tenant.orderPrefix);
  if (number === null) return null;
  const order = await tenantDb(tenant.id).order.findFirst({
    where: { number },
    select: {
      id: true,
      number: true,
      status: true,
      amount: true,
      payments: { where: { status: "CONFIRMED" }, select: { amount: true } },
    },
  });
  if (!order || !(await hasTrackingPass(tenant.id, order.id))) return null;
  return {
    ...order,
    due: amountDue(
      order.amount,
      order.payments.map((p) => p.amount),
    ),
  };
}

const notYours = refuse("We couldn't find this order in your browser. Open your tracking link and try again.");

// ---------- The prompt (STK Push) ----------

export async function sendPaymentPrompt(
  tenant: CurrentTenant,
  ref: string,
  typedPhone: string,
): Promise<{ ok: true; paymentId: string; phone: string; amount: number; pretend: boolean } | Refused> {
  const order = await payableOrder(tenant, ref);
  if (!order) return notYours;
  if (!(UNPAID as readonly string[]).includes(order.status) || order.due === 0)
    return refuse("This order is already paid.");
  const phone = mpesaPhone(typedPhone);
  if (!phone) return refuse("Enter a Safaricom M-Pesa number, e.g. 0712 345 678.");

  const db = tenantDb(tenant.id);
  const recent = await db.payment.count({
    where: {
      orderId: order.id,
      channel: "MPESA_STK",
      createdAt: { gte: new Date(Date.now() - PROMPT_LIMIT.minutes * 60_000) },
    },
  });
  if (recent >= PROMPT_LIMIT.count)
    return refuse(`Too many prompts in a few minutes. Wait ${PROMPT_LIMIT.minutes} minutes, or pay by Paybill.`);

  const account = accountNumber(order.number);
  const sent = await mpesa.sendPrompt({
    phone,
    amount: order.due,
    account,
    description: `${tenant.name} order ${ref}`,
  });
  if (!sent.ok) return refuse(sent.error);

  const payment = await db.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        channel: "MPESA_STK",
        status: "PENDING",
        amount: order.due,
        phone,
        accountReference: account,
        checkoutRequestId: sent.checkoutRequestId,
        merchantRequestId: sent.merchantRequestId,
      },
      select: { id: true },
    });
    await tx.orderEvent.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        kind: "promptSent",
        actorType: "CLIENT",
        data: { phone: localPhone(phone), amount: order.due },
      },
    });
    return created;
  }, TX);
  return { ok: true, paymentId: payment.id, phone: localPhone(phone), amount: order.due, pretend: mpesa.pretend };
}

export type PromptStatus =
  { state: "waiting" } | { state: "paid"; receipt: string; amount: number } | { state: "failed"; message: string };

const statusOf = (payment: { status: string; receipt: string | null; amount: number; raw: unknown }): PromptStatus => {
  if (payment.status === "CONFIRMED") return { state: "paid", receipt: payment.receipt ?? "", amount: payment.amount };
  if (payment.status === "PENDING") return { state: "waiting" };
  const outcome = (payment.raw as { outcome?: PromptOutcome } | null)?.outcome ?? "failed";
  return { state: "failed", message: PROMPT_RESULT[outcome] ?? PROMPT_RESULT.failed };
};

// The pay box asks every few seconds how the prompt went
export async function checkPaymentPrompt(
  tenant: CurrentTenant,
  ref: string,
  paymentId: string,
): Promise<PromptStatus | Refused> {
  const order = await payableOrder(tenant, ref);
  if (!order) return notYours;
  const payment = await tenantDb(tenant.id).payment.findFirst({
    where: { id: paymentId, orderId: order.id, channel: "MPESA_STK" },
    select: { status: true, receipt: true, amount: true, raw: true, createdAt: true, checkoutRequestId: true },
  });
  if (!payment) return refuse("We couldn't find that payment. Please try again.");
  // M-Pesa drops an unanswered prompt after about a minute. (With Daraja, the server will ask
  // Safaricom here before giving up.)
  const expired = Date.now() - payment.createdAt.getTime() > (PROMPT_SECONDS + 30) * 1000;
  if (payment.status === "PENDING" && expired && payment.checkoutRequestId) {
    await settlePrompt(tenant.id, payment.checkoutRequestId, { ok: false, outcome: "timeout" });
    return { state: "failed", message: PROMPT_RESULT.timeout };
  }
  return statusOf(payment);
}

// The pretend M-Pesa only: the tester plays the client's phone
export async function pretendPhoneAnswer(
  tenant: CurrentTenant,
  ref: string,
  paymentId: string,
  outcome: PretendOutcome,
): Promise<PromptStatus | Refused> {
  if (!mpesa.pretend) return refuse("Not available: real M-Pesa is connected.");
  const order = await payableOrder(tenant, ref);
  if (!order) return notYours;
  const payment = await tenantDb(tenant.id).payment.findFirst({
    where: { id: paymentId, orderId: order.id, status: "PENDING" },
    select: { checkoutRequestId: true },
  });
  if (!payment?.checkoutRequestId) return refuse("This prompt has already been answered.");
  await settlePrompt(
    tenant.id,
    payment.checkoutRequestId,
    outcome === "paid" ? { ok: true, receipt: pretendReceipt() } : { ok: false, outcome },
  );
  return checkPaymentPrompt(tenant, ref, paymentId);
}

// How a prompt ended: from the pretend phone now, and from Safaricom's callback once Daraja is
// connected. A confirmed payment is added to the order; once the order is paid in full it moves to
// Paid and the first-draft clock starts. Safe to call twice: only a pending payment is settled.
export async function settlePrompt(
  tenantId: string,
  checkoutRequestId: string,
  result: { ok: true; receipt: string } | { ok: false; outcome: Exclude<PromptOutcome, "paid"> },
) {
  const db = tenantDb(tenantId);
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { checkoutRequestId, status: "PENDING" },
      select: { id: true, orderId: true, amount: true, raw: true },
    });
    if (!payment) return;
    const now = new Date();
    if (!result.ok) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: result.outcome === "cancelled" ? "CANCELLED" : "FAILED",
          raw: { outcome: result.outcome },
        },
      });
      return;
    }
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "CONFIRMED", match: "ORDER_NUMBER", receipt: result.receipt, confirmedAt: now },
    });
    if (!payment.orderId) return;
    const order = await tx.order.findFirst({
      where: { id: payment.orderId },
      select: { amount: true, payments: { where: { status: "CONFIRMED" }, select: { amount: true } } },
    });
    if (!order) return;
    const paidInFull =
      amountDue(
        order.amount,
        order.payments.map((p) => p.amount),
      ) === 0;
    // Only an unpaid order moves (an abandoned one comes back to life)
    const moved = paidInFull
      ? (
          await tx.order.updateMany({
            where: { id: payment.orderId, status: { in: [...UNPAID] } },
            data: { status: "PAID", paidAt: now },
          })
        ).count === 1
      : false;
    await tx.orderEvent.create({
      data: {
        tenantId,
        orderId: payment.orderId,
        kind: moved ? "paid" : "partPaid",
        actorType: "MPESA",
        data: { amount: payment.amount, receipt: result.receipt },
        visibleToClient: true,
      },
    });
  }, TX);
}

// ---------- Paybill: the account number, shown when the client asks for it ----------

export async function showPaybillAccount(
  tenant: CurrentTenant,
  ref: string,
): Promise<{ ok: true; account: string } | Refused> {
  const order = await payableOrder(tenant, ref);
  if (!order) return notYours;
  // Noted for the team: a Paybill payment for this order is probably on its way, which helps match
  // one that arrives with a name typed instead of the number
  const db = tenantDb(tenant.id);
  const lately = await db.orderEvent.count({
    where: { orderId: order.id, kind: "paybillShown", at: { gte: new Date(Date.now() - 10 * 60_000) } },
  });
  if (!lately)
    await db.orderEvent.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        kind: "paybillShown",
        actorType: "CLIENT",
        data: Prisma.JsonNull,
      },
    });
  return { ok: true, account: accountNumber(order.number) };
}
