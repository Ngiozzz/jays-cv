import { z } from "zod";
import { DAY, type RuleOrder } from "./orders.rules";
import { CV_TYPES, MAX_CV_BYTES } from "./place-order";

// The client's side of a draft on their tracking page: asking for changes (one note per round, with
// an optional file), approving it, and the review they leave once the order is complete.

// ---------- Change requests ----------

export const MAX_CHANGE_TEXT = 1000;

export const changeRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, "Tell your writer what you'd like changed (a sentence or two).")
    .max(MAX_CHANGE_TEXT, "Keep it under 1,000 characters."),
});

// The optional file sent with a change request, e.g. the client's own marked-up copy
export function changesFileProblem(file: { size: number; type: string } | null): string | null {
  if (!file || file.size === 0) return null;
  if (!CV_TYPES.includes(file.type)) return "Attach a PDF, Word document or photo.";
  if (file.size > MAX_CV_BYTES) return "That file is over 10 MB. Please attach a smaller file or a photo.";
  return null;
}

export type ClientRounds =
  { canAsk: true; left: number; limit: number } | { canAsk: true; until: Date } | { canAsk: false; reason: string };

// How many change rounds the client has left (or until when, for packages with unlimited rounds)
export function clientRounds(order: RuleOrder, now: Date): ClientRounds {
  if (order.revisionRounds === null) {
    const days = order.revisionWindowDays ?? 14;
    const until = new Date((order.paidAt ?? order.createdAt).getTime() + days * DAY);
    return now < until
      ? { canAsk: true, until }
      : { canAsk: false, reason: `Your ${days}-day change period has ended.` };
  }
  const limit = order.revisionRounds;
  const left = limit - order.revisions.length;
  return left > 0
    ? { canAsk: true, left, limit }
    : { canAsk: false, reason: `You've used all ${limit} change ${limit === 1 ? "round" : "rounds"}.` };
}

// ---------- Reviews ----------

export const reviewSchema = z.object({
  rating: z.coerce
    .number({ error: "Tap the stars to rate us." })
    .int("Tap the stars to rate us.")
    .min(1, "Tap the stars to rate us.")
    .max(5, "Tap the stars to rate us."),
  text: z
    .string()
    .trim()
    .min(10, "Tell others a little about your experience.")
    .max(600, "Keep it under 600 characters."),
  name: z.string().trim().min(2, "Enter your name.").max(60, "Keep your name under 60 characters."),
  role: z
    .string()
    .trim()
    .max(60, "Keep it under 60 characters.")
    .transform((value) => value || null),
  // The client agreed to their review being shown on the website
  consent: z.boolean(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export function reviewFormToInput(form: FormData): unknown {
  return {
    rating: String(form.get("rating") ?? ""),
    text: String(form.get("text") ?? ""),
    name: String(form.get("name") ?? ""),
    role: String(form.get("role") ?? ""),
    consent: form.get("consent") === "on",
  };
}

// 1 or 2 stars: the owner is alerted so they can call the client
export const isLowRating = (rating: number) => rating <= 2;
