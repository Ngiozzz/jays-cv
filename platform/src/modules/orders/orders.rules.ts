import type { OrderStatus } from "@/generated/prisma/enums";

// The order rules, shared by the admin (team view), the tracking page (client view) and the
// nightly jobs. Pure functions: the time is always passed in, nothing is read or saved here.

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

// From Business settings
export type OrderTimings = {
  unpaidHours: number;
  reminderDays: number;
  autoCompleteDays: number;
  revisionHours: number;
};

// What the rules need to know about an order
export type RuleOrder = {
  status: OrderStatus;
  createdAt: Date;
  paidAt: Date | null;
  draftSentAt: Date | null;
  remindedAt: Date | null;
  writerId: string | null;
  firstDraftHours: number;
  // Time the owner added to the current deadline
  extraHours: number;
  // null = unlimited rounds, within revisionWindowDays of payment
  revisionRounds: number | null;
  revisionWindowDays: number | null;
  // When each change request was made, oldest first
  revisions: Date[];
};

// The team and the client see different wording for the same status
export const STATUS_TEXT: Record<OrderStatus, { team: string; client: string; tone: string }> = {
  NEW: { team: "Awaiting payment", client: "Waiting for payment", tone: "st-new" },
  ABANDONED: { team: "Abandoned (unpaid)", client: "Waiting for payment", tone: "st-abandoned" },
  PAID: { team: "⚠ Not accepted", client: "Payment confirmed", tone: "st-open" },
  WRITING: { team: "Writing", client: "Your writer is working on it", tone: "st-writing" },
  DRAFT_SENT: { team: "Draft with client", client: "Your draft is ready", tone: "st-draft" },
  REVISIONS: { team: "Revisions", client: "Making your changes", tone: "st-revisions" },
  DELIVERED: { team: "Delivered", client: "Completed", tone: "st-delivered" },
};

// "JC-1048": shown everywhere and used as the M-Pesa account number
export const orderRef = (prefix: string, number: number) => `${prefix}-${number}`;

// ---------- Deadlines ----------

const plus = (date: Date, ms: number) => new Date(date.getTime() + ms);

export const abandonAt = (order: RuleOrder, timings: OrderTimings) => plus(order.createdAt, timings.unpaidHours * HOUR);

// The first-draft clock starts when payment is confirmed; extra time counts until the first change request
export function firstDraftDue(order: RuleOrder): Date | null {
  if (!order.paidAt) return null;
  const extra = order.revisions.length ? 0 : order.extraHours;
  return plus(order.paidAt, (order.firstDraftHours + extra) * HOUR);
}

export function revisionDue(order: RuleOrder, timings: OrderTimings): Date | null {
  const last = order.revisions.at(-1);
  return last ? plus(last, (timings.revisionHours + order.extraHours) * HOUR) : null;
}

export const reminderAt = (order: RuleOrder, timings: OrderTimings) =>
  order.draftSentAt ? plus(order.draftSentAt, timings.reminderDays * DAY) : null;

export const autoCompleteAt = (order: RuleOrder, timings: OrderTimings) =>
  order.draftSentAt ? plus(order.draftSentAt, timings.autoCompleteDays * DAY) : null;

// The deadline the team is working to right now
export function currentDeadline(order: RuleOrder, timings: OrderTimings): Date | null {
  if (order.status === "PAID" || order.status === "WRITING") return firstDraftDue(order);
  if (order.status === "REVISIONS") return revisionDue(order, timings);
  return null;
}

// "45 min", "5h", "2d 3h"
export function span(ms: number): string {
  const hours = Math.abs(ms) / HOUR;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`;
}

// The clock on the team's order list: "Due in 5h", "Overdue 2h", …
export function dueClock(
  order: RuleOrder,
  timings: OrderTimings,
  now: Date,
): { text: string; tone: "" | "soon" | "late" | "muted" | "done" } {
  const deadline = currentDeadline(order, timings);
  if (deadline) {
    const left = deadline.getTime() - now.getTime();
    if (left < 0) return { text: `Overdue ${span(left)}`, tone: "late" };
    return { text: `Due in ${span(left)}`, tone: left < 6 * HOUR ? "soon" : "" };
  }
  switch (order.status) {
    case "NEW":
      return { text: `Unpaid · abandons in ${span(abandonAt(order, timings).getTime() - now.getTime())}`, tone: "" };
    case "ABANDONED":
      return { text: `Unpaid ${timings.unpaidHours}h+`, tone: "muted" };
    case "DRAFT_SENT":
      return {
        text: `With client · auto-completes in ${span(autoCompleteAt(order, timings)!.getTime() - now.getTime())}`,
        tone: "",
      };
    default:
      return { text: "Delivered", tone: "done" };
  }
}

// ---------- Revision rounds ----------

export const unlimitedRounds = (order: RuleOrder) => order.revisionRounds === null;

export function roundsLabel(order: RuleOrder): string {
  if (unlimitedRounds(order)) return `Unlimited rounds (${order.revisionWindowDays ?? 14} days)`;
  const limit = order.revisionRounds!;
  return `${order.revisions.length} of ${limit} revision ${limit === 1 ? "round" : "rounds"} used`;
}

// Whether the client may still ask for changes, and if not, why
function changesAllowed(order: RuleOrder, now: Date): string | null {
  if (unlimitedRounds(order)) {
    const days = order.revisionWindowDays ?? 14;
    if (order.paidAt && now.getTime() > order.paidAt.getTime() + days * DAY)
      return `The ${days}-day revision window has ended. Extra changes can be offered as a paid add-on.`;
    return null;
  }
  const limit = order.revisionRounds!;
  if (order.revisions.length >= limit)
    return `All ${limit} revision ${limit === 1 ? "round is" : "rounds are"} used. Extra rounds can be offered as a paid add-on.`;
  return null;
}

// ---------- Steps (each returns the change to save, or why it can't happen) ----------

export type Step<T> = { ok: true; change: T } | { ok: false; error: string };
const refuse = (error: string): { ok: false; error: string } => ({ ok: false, error });

export function payStep(order: RuleOrder, now: Date): Step<{ status: "PAID"; paidAt: Date }> {
  if (order.status !== "NEW" && order.status !== "ABANDONED") return refuse("This order is already paid.");
  return { ok: true, change: { status: "PAID", paidAt: now } };
}

// A paid order is open to every writer; the first to accept gets it. (The database update is
// conditional on the order still being unaccepted, so two writers can never both get it.)
export function acceptStep(
  order: RuleOrder,
  writerId: string,
  now: Date,
): Step<{ status: "WRITING"; writerId: string; acceptedAt: Date }> {
  if (order.writerId) return refuse("Another writer already accepted this order.");
  if (order.status !== "PAID") return refuse("Only paid orders can be accepted.");
  return { ok: true, change: { status: "WRITING", writerId, acceptedAt: now } };
}

// Only the owner reassigns (checked by the caller)
export function reassignStep(order: RuleOrder, writerId: string): Step<{ writerId: string }> {
  if (!order.writerId) return refuse("Nobody has accepted this order yet.");
  if (order.status === "DELIVERED" || order.status === "ABANDONED") return refuse("This order is closed.");
  if (writerId === order.writerId) return refuse("Choose a different writer.");
  return { ok: true, change: { writerId } };
}

// Sending needs a file, so "sent" always means the client really has a draft
export function sendDraftStep(
  order: RuleOrder,
  hasFile: boolean,
  now: Date,
): Step<{ status: "DRAFT_SENT"; draftSentAt: Date; remindedAt: null }> {
  if (order.status !== "WRITING" && order.status !== "REVISIONS")
    return refuse("A draft can only be sent while writing or revising.");
  if (!hasFile) return refuse("Upload the draft file first.");
  return { ok: true, change: { status: "DRAFT_SENT", draftSentAt: now, remindedAt: null } };
}

export function requestChangesStep(
  order: RuleOrder,
  text: string,
  now: Date,
): Step<{ status: "REVISIONS"; round: number; text: string; extraHours: 0 }> {
  if (order.status !== "DRAFT_SENT") return refuse("Changes can be requested once a draft has been sent.");
  const wanted = text.trim();
  if (wanted.length < 3) return refuse("Describe the changes needed.");
  const blocked = changesAllowed(order, now);
  if (blocked) return refuse(blocked);
  // Extra time the owner gave applied to the last deadline only
  return { ok: true, change: { status: "REVISIONS", round: order.revisions.length + 1, text: wanted, extraHours: 0 } };
}

export function completeStep(order: RuleOrder, now: Date): Step<{ status: "DELIVERED"; deliveredAt: Date }> {
  if (order.status !== "DRAFT_SENT") return refuse("Send a draft before completing the order.");
  return { ok: true, change: { status: "DELIVERED", deliveredAt: now } };
}

// The owner gives the writer more time on the current deadline
export function extendStep(order: RuleOrder, hours: number, timings: OrderTimings): Step<{ extraHours: number }> {
  if (!currentDeadline(order, timings)) return refuse("There's no deadline running on this order.");
  if (!Number.isInteger(hours) || hours < 1 || hours > 72) return refuse("Add between 1 and 72 hours.");
  return { ok: true, change: { extraHours: order.extraHours + hours } };
}

// ---------- Automatic steps (the nightly job and every page load check these) ----------

export type AutoStep = "abandon" | "remind" | "autoComplete";

export function dueAutoSteps(order: RuleOrder, timings: OrderTimings, now: Date): AutoStep[] {
  const t = now.getTime();
  if (order.status === "NEW") return t >= abandonAt(order, timings).getTime() ? ["abandon"] : [];
  if (order.status !== "DRAFT_SENT") return [];
  if (t >= autoCompleteAt(order, timings)!.getTime()) return ["autoComplete"];
  if (!order.remindedAt && t >= reminderAt(order, timings)!.getTime()) return ["remind"];
  return [];
}
