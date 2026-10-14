import "server-only";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import * as history from "./history";
import {
  describeMove,
  moveReview,
  newReviewSchema,
  REVIEW_MOVES,
  reviewTextSchema,
  statusOfNewReview,
  type ReviewMove,
  type ReviewStatus,
} from "./reviews";
import * as repo from "./reviews.repo";
import { fieldErrorsOf, type SaveResult } from "./save-result";

// Admin → Website content → Reviews (owner only). Each change records the review as it was,
// so "Recent changes" can undo it.

export async function loadReviews(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  return repo.findAllReviews(member.tenant.id);
}

export type AdminReview = Awaited<ReturnType<typeof loadReviews>>[number];

// What "Recent changes" keeps: the review before the change, or the id of a review that was added
type ReviewBefore = { id: string; status: ReviewStatus; featured: boolean; text: string } | { id: string; added: true };

export async function restoreReview(tx: history.Tx, before: unknown) {
  const review = before as ReviewBefore;
  if ("added" in review) return repo.deleteReview(tx, review.id);
  const { id, ...data } = review;
  return repo.updateReview(tx, id, data);
}

const snapshot = (review: { id: string; status: ReviewStatus; featured: boolean; text: string }): ReviewBefore => ({
  id: review.id,
  status: review.status,
  featured: review.featured,
  text: review.text,
});

export async function changeReview(member: CurrentMember, reviewId: string, move: ReviewMove): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  if (!REVIEW_MOVES.includes(move)) return { ok: false, fieldErrors: { form: "Unknown action." } };
  const tenantId = member.tenant.id;
  const [review, onHomepage] = await Promise.all([repo.findReview(tenantId, reviewId), repo.countOnHomepage(tenantId)]);
  if (!review) return { ok: false, fieldErrors: { form: "This review no longer exists." } };
  const result = moveReview(review, move, onHomepage);
  if (!result.ok) return { ok: false, fieldErrors: { form: result.error } };
  const summary = describeMove(move, review.name);
  await history.inTransaction(tenantId, async (tx) => {
    await repo.updateReview(tx, review.id, result.next);
    await history.recordChange(tx, tenantId, {
      section: "reviews",
      summary,
      before: snapshot(review),
      changedById: member.id,
    });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}

// Typo fixes only: the owner shouldn't put words in a client's mouth
export async function editReviewText(member: CurrentMember, reviewId: string, raw: unknown): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = reviewTextSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const tenantId = member.tenant.id;
  const review = await repo.findReview(tenantId, reviewId);
  if (!review) return { ok: false, fieldErrors: { form: "This review no longer exists." } };
  if (review.text === parsed.data.text) return { ok: true, message: "Nothing changed." };
  const summary = `edited the wording of ${review.name}'s review`;
  await history.inTransaction(tenantId, async (tx) => {
    await repo.updateReview(tx, review.id, { text: parsed.data.text });
    await history.recordChange(tx, tenantId, {
      section: "reviews",
      summary,
      before: snapshot(review),
      changedById: member.id,
    });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}

export async function addReview(member: CurrentMember, raw: unknown): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = newReviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const tenantId = member.tenant.id;
  const status = statusOfNewReview(parsed.data);
  const summary = `added a review from ${parsed.data.name}${status === "HIDDEN" ? " (kept private)" : ""}`;
  await history.inTransaction(tenantId, async (tx) => {
    const review = await repo.createReview(tx, tenantId, { ...parsed.data, status });
    const before: ReviewBefore = { id: review.id, added: true };
    await history.recordChange(tx, tenantId, { section: "reviews", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved: ${summary}` };
}
