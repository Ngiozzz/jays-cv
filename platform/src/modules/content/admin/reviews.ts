import { z } from "zod";

// Reviews tab: clients' reviews wait for the owner, who publishes them (only with the client's
// permission) and picks up to 3 for the homepage and Samples page

export const MAX_ON_HOMEPAGE = 3;

export type ReviewStatus = "PENDING" | "APPROVED" | "HIDDEN";
export type ReviewState = { status: ReviewStatus; featured: boolean; consent: boolean };

export const REVIEW_MOVES = ["approve", "private", "hide", "restore", "feature", "unfeature"] as const;
export type ReviewMove = (typeof REVIEW_MOVES)[number];

// One button press on a review card: the review's new state, or why it isn't allowed
export function moveReview(
  review: ReviewState,
  move: ReviewMove,
  onHomepage: number,
): { ok: true; next: Pick<ReviewState, "status" | "featured"> } | { ok: false; error: string } {
  switch (move) {
    case "approve":
      if (!review.consent) return { ok: false, error: "The client didn't agree to this review being published." };
      return { ok: true, next: { status: "APPROVED", featured: review.featured } };
    case "private":
    case "hide":
      return { ok: true, next: { status: "HIDDEN", featured: false } };
    case "restore":
      return { ok: true, next: { status: "PENDING", featured: false } };
    case "feature":
      if (review.status !== "APPROVED" || !review.consent)
        return { ok: false, error: "Publish the review before putting it on the homepage." };
      if (review.featured) return { ok: true, next: { status: review.status, featured: true } };
      if (onHomepage >= MAX_ON_HOMEPAGE)
        return { ok: false, error: `Only ${MAX_ON_HOMEPAGE} reviews can be on the homepage. Remove one first.` };
      return { ok: true, next: { status: review.status, featured: true } };
    case "unfeature":
      return { ok: true, next: { status: review.status, featured: false } };
  }
}

// How each move reads in "Recent changes"
export function describeMove(move: ReviewMove, name: string) {
  return {
    approve: `published ${name}'s review`,
    private: `kept ${name}'s review private (no permission to publish)`,
    hide: `hid ${name}'s review`,
    restore: `moved ${name}'s review back to waiting`,
    feature: `put ${name}'s review on the homepage`,
    unfeature: `took ${name}'s review off the homepage`,
  }[move];
}

const reviewText = z.string().trim().min(10, "Write at least a sentence").max(600, "Keep it under 600 characters");

export const reviewTextSchema = z.object({ text: reviewText });

// A review the owner adds by hand, e.g. one a client sent on WhatsApp
export const newReviewSchema = z.object({
  name: z.string().trim().min(2, "Enter the client's name").max(60),
  role: z.string().trim().max(80, "Keep it under 80 characters"),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5, "Pick a rating"),
  text: reviewText,
  source: z.string().trim().min(2, "Say where the review came from").max(40),
  consent: z.boolean(),
});

export type NewReview = z.infer<typeof newReviewSchema>;

export function newReviewFormToInput(form: FormData): unknown {
  return {
    name: form.get("name") ?? "",
    role: form.get("role") ?? "",
    rating: form.get("rating") ?? "",
    text: form.get("text") ?? "",
    source: form.get("source") ?? "",
    consent: form.get("consent") === "on",
  };
}

// Added reviews go straight to "Published" when the client agreed, otherwise they're kept private
export const statusOfNewReview = (review: Pick<NewReview, "consent">): ReviewStatus =>
  review.consent ? "APPROVED" : "HIDDEN";
