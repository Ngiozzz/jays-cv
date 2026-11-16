import { createHash } from "node:crypto";

// How many M-Pesa prompts the website will send, so nobody can use it to bother someone else's
// phone. Counted per phone number (across every order and CV check) and per visitor (whatever
// numbers they type). Pure: the limits and the message; the service does the counting.

export const PHONE_LIMIT = { count: 3, minutes: 10 };
export const PHONE_DAY_LIMIT = 8;
// Generous: many Kenyans on the same mobile network share one internet address
export const VISITOR_LIMIT = { count: 15, minutes: 60 };

export type PromptCounts = { phoneRecent: number; phoneToday: number; visitorRecent: number };

// What to tell the person, or null when the prompt may go. paybill: whether they can pay by Paybill instead.
export function promptLimitProblem(counts: PromptCounts, paybill: boolean): string | null {
  const orPaybill = paybill ? ", or pay by Paybill" : "";
  if (counts.phoneToday >= PHONE_DAY_LIMIT)
    return `This number has had too many M-Pesa prompts today. Please try again tomorrow${orPaybill}.`;
  if (counts.phoneRecent >= PHONE_LIMIT.count)
    return `This number has had several M-Pesa prompts just now. Wait ${PHONE_LIMIT.minutes} minutes${orPaybill}.`;
  if (counts.visitorRecent >= VISITOR_LIMIT.count)
    return `Too many M-Pesa prompts from here. Please try again in an hour${orPaybill}.`;
  return null;
}

const hashed = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);

// Each prompt is noted twice: for the phone it went to and for the visitor who sent it. Hashed, so
// neither the number nor the internet address is kept; kept a day (the longest limit), then deleted.
export const promptPhoneKey = (phone: string) => `prompt-phone:${hashed(phone)}`;
export const promptVisitorKey = (ip: string) => `prompt:${hashed(ip)}`;
