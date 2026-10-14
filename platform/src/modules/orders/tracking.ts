import { z } from "zod";
import type { OrderStatus } from "@/generated/prisma/enums";
import { whatsappDigits } from "@/modules/content/contact";

// "Track my order": a client proves an order is theirs with its number and the phone number they
// ordered with. Order numbers run in sequence, so guessing is limited (see TRY_LIMITS).

export const TRY_LIMITS = {
  // Wrong tries for one order before it's locked for a while
  perOrder: { tries: 5, minutes: 15 },
  // Wrong tries from one visitor (any orders) before they're paused
  perVisitor: { tries: 20, minutes: 60 },
} as const;

export const lookupSchema = z.object({
  order: z.string().trim().min(1, "Enter your order number").max(20, "Check your order number"),
  phone: z.string().trim().min(9, "Enter the phone number you ordered with").max(20, "Check the phone number"),
});

export type LookupInput = z.infer<typeof lookupSchema>;

// "JC-1048", "jc 1048", "JC1048" and "1048" all mean order 1048
export function parseOrderNumber(input: string, prefix: string): number | null {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^(?:${escaped}\\s*-?\\s*)?(\\d{1,9})$`, "i").exec(input.trim());
  return match ? Number(match[1]) : null;
}

// The same Kenyan number however it's written: 0712 345 678, +254712345678, 254 712-345-678
export function samePhone(typed: string, stored: string): boolean {
  const a = whatsappDigits(typed);
  return a.length === 12 && a === whatsappDigits(stored);
}

export const isLocked = (wrongTries: number, limit: { tries: number }) => wrongTries >= limit.tries;

// ---------- What the client sees ----------

export const CLIENT_STEPS = ["Order received", "Payment confirmed", "Writing", "Your review", "Completed"] as const;

// Which step the order is on (changes being made count as writing again)
export const STEP_OF: Record<OrderStatus, number> = {
  NEW: 0,
  ABANDONED: 0,
  PAID: 1,
  WRITING: 2,
  REVISIONS: 2,
  DRAFT_SENT: 3,
  DELIVERED: 4,
};

// "Dr. Amina Wanjiru" → "Amina"
export const greetingName = (name: string) =>
  name
    .replace(/^(dr|mr|mrs|ms|miss|prof)\.?\s+/i, "")
    .trim()
    .split(/\s+/)[0] || "there";
