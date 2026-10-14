import type { ActorType } from "@/generated/prisma/enums";

// What can happen to an order. Each event is stored with structured details (`data`) and turned
// into words per viewer here, so writers never see money and clients see their own wording.

export const EVENT_KINDS = [
  "placed",
  "promptSent",
  "paybillShown",
  "partPaid",
  "paid",
  "accepted",
  "reassigned",
  "draftSent",
  "changesRequested",
  "completed",
  "autoCompleted",
  "reminded",
  "abandoned",
  "extended",
  "note",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export type ClientEvent = {
  kind: string;
  actorType: ActorType;
  actorName: string | null;
  data: unknown;
  at: Date;
};

const kes = (amount: string) => `KES ${Number(amount).toLocaleString("en-KE")}`;
const firstName = (name: string | null) => (name ?? "Your writer").trim().split(/\s+/)[0];
const field = (data: unknown, name: string) =>
  data && typeof data === "object" && name in data ? String((data as Record<string, unknown>)[name]) : "";

// Who did it, as the client reads it
export function clientActor(event: ClientEvent, businessName: string): string {
  switch (event.actorType) {
    case "CLIENT":
      return "You";
    case "MPESA":
      return "M-Pesa";
    case "SYSTEM":
      return businessName;
    default:
      return firstName(event.actorName);
  }
}

// What happened, as the client reads it (null: not shown to clients)
export function clientEventText(event: ClientEvent): string | null {
  switch (event.kind) {
    case "placed":
      return "Placed the order";
    case "paid": {
      const receipt = field(event.data, "receipt");
      return receipt ? `Payment received (M-Pesa code ${receipt})` : "Payment received";
    }
    case "partPaid":
      return `Part payment received: ${kes(field(event.data, "amount"))} (M-Pesa code ${field(event.data, "receipt")})`;
    case "accepted":
      return "Accepted your order and started writing";
    case "reassigned":
      return `Your order is now with ${firstName(field(event.data, "toName") || null)}`;
    case "draftSent": {
      const version = field(event.data, "version");
      return version ? `Sent you draft ${version}` : "Sent you a draft";
    }
    case "changesRequested":
      return `Asked for changes: "${field(event.data, "text")}"`;
    case "completed":
      return "Approved the draft. Order completed";
    case "autoCompleted":
      return "No reply for a few days, so your order was completed automatically";
    case "reminded":
      return "Reminded you to review your draft";
    default:
      return null;
  }
}

// ---------- The team's view ----------

// Who did it, as the team reads it
export function teamActor(event: ClientEvent): string {
  switch (event.actorType) {
    case "CLIENT":
      return "Client";
    case "MPESA":
      return "M-Pesa";
    case "SYSTEM":
      return "System";
    default:
      return firstName(event.actorName);
  }
}

// What happened, as the team reads it. Amounts only for those who see money.
export function teamEventText(event: ClientEvent, money: boolean): string {
  const get = (name: string) => field(event.data, name);
  switch (event.kind) {
    case "placed":
      return "Placed the order";
    case "promptSent":
      return `Asked for an M-Pesa prompt on ${get("phone")}`;
    case "paybillShown":
      return "Opened the Paybill account number (a Paybill payment may be on its way)";
    case "partPaid":
      return `Part payment received${money && get("amount") ? `: ${kes(get("amount"))}` : ""} (ref ${get("receipt")})`;
    case "paid": {
      const amount = money && get("amount") ? `: ${kes(get("amount"))}` : "";
      const how = get("manual") === "true" ? "Payment recorded by hand" : "Payment received";
      return `${how}${amount}${get("receipt") ? ` (ref ${get("receipt")})` : ""}`;
    }
    case "accepted":
      return "Accepted the order and started writing";
    case "reassigned":
      return `Reassigned the order from ${get("fromName")} to ${get("toName")}`;
    case "draftSent":
      return `Sent draft ${get("version")} to the client`;
    case "changesRequested": {
      // The client asked on their tracking page, or the team logged what they said on a call or chat
      const how = event.actorType === "CLIENT" ? "Asked for changes" : "Logged change request";
      return `${how} (round ${get("round")}${get("via") ? `, ${get("via")}` : ""}): "${get("text")}"`;
    }
    case "completed":
      return "Marked the order complete (client approved)";
    case "autoCompleted":
      return "No reply from the client: completed automatically";
    case "reminded":
      return "Reminded the client to review their draft";
    case "abandoned":
      return "No payment in time: marked abandoned";
    case "extended":
      return `Gave the writer ${get("hours")} more hours`;
    case "note":
      return `Note: ${get("text")}`;
    default:
      return event.kind;
  }
}
