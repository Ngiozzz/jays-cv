import type { OrderStatus } from "@/generated/prisma/enums";
import type { OrderTimings } from "./orders.rules";

// "What happens next" on the team's order page: who moves the order on, and how.

export type NextStep = { who: string; what: string; how: string; automatic: "yes" | "partly" | "no" };

type Context = {
  status: OrderStatus;
  ref: string;
  writerName: string | null;
  paybill: string;
  // Shown to the owner only
  amount: string | null;
  roundsLabel: string;
  timings: OrderTimings & { deleteAbandonedDays: number };
};

export function nextStep(order: Context): NextStep {
  const writer = order.writerName?.split(/\s+/)[0] ?? "A writer";
  const { timings } = order;
  switch (order.status) {
    case "NEW":
      return {
        who: "Client → M-Pesa",
        what: `The client pays${order.amount ? ` ${order.amount}` : ""} by M-Pesa: the prompt on their phone, or Paybill ${order.paybill} with account ${order.ref}.`,
        how: "Automatic: M-Pesa confirms the payment and the order becomes Paid. If they stall, send a payment reminder.",
        automatic: "yes",
      };
    case "ABANDONED":
      return {
        who: "Owner",
        what: "Send a friendly payment reminder, or record the payment if the client paid another way.",
        how: `Automatic: marked abandoned after ${timings.unpaidHours}h without payment, and deleted ${timings.deleteAbandonedDays} days after it was placed. The owner can delete it sooner.`,
        automatic: "yes",
      };
    case "PAID":
      return {
        who: "Any writer",
        what: 'The order is open. The first writer to press "Accept" takes it, and the system records who and when.',
        how: "The first-draft clock is already running (it started when the payment was confirmed).",
        automatic: "no",
      };
    case "WRITING":
      return {
        who: writer,
        what: `${writer} writes it (calling the client if needed), then uploads the draft and sends it.`,
        how: "Sending needs a file, so “sent” always means the client really has a draft.",
        automatic: "no",
      };
    case "DRAFT_SENT":
      return {
        who: "Client",
        what: "The client reviews the draft on their tracking page, or replies on WhatsApp and the team records it here.",
        how: `Automatic: a reminder after ${timings.reminderDays} days, and completed after ${timings.autoCompleteDays} days with no reply.`,
        automatic: "partly",
      };
    case "REVISIONS":
      return {
        who: writer,
        what: `${writer} makes the requested changes, uploads the revised draft and sends it.`,
        how: `${order.roundsLabel}. The revised draft is due within ${timings.revisionHours}h of the request.`,
        automatic: "no",
      };
    case "DELIVERED":
      return {
        who: "Nobody",
        what: "Order complete. The client has their final version.",
        how: "The client gets 30 days of free minor updates.",
        automatic: "yes",
      };
  }
}
