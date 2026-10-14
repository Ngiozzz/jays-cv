import { describe, expect, it } from "vitest";
import { describeMove, moveReview, newReviewSchema, statusOfNewReview, type ReviewState } from "./reviews";

const waiting: ReviewState = { status: "PENDING", featured: false, consent: true };
const published: ReviewState = { status: "APPROVED", featured: false, consent: true };

describe("moveReview", () => {
  it("publishes only reviews the client agreed to share", () => {
    expect(moveReview(waiting, "approve", 0)).toEqual({ ok: true, next: { status: "APPROVED", featured: false } });
    expect(moveReview({ ...waiting, consent: false }, "approve", 0).ok).toBe(false);
  });

  it("allows at most 3 on the homepage, and only published ones", () => {
    expect(moveReview(published, "feature", 2)).toEqual({ ok: true, next: { status: "APPROVED", featured: true } });
    expect(moveReview(published, "feature", 3)).toMatchObject({ ok: false, error: expect.stringContaining("3") });
    expect(moveReview(waiting, "feature", 0).ok).toBe(false);
  });

  it("takes a hidden review off the homepage", () => {
    expect(moveReview({ ...published, featured: true }, "hide", 3)).toEqual({
      ok: true,
      next: { status: "HIDDEN", featured: false },
    });
    expect(moveReview({ ...published, status: "HIDDEN" }, "restore", 0)).toEqual({
      ok: true,
      next: { status: "PENDING", featured: false },
    });
  });
});

describe("reviews added by hand", () => {
  const form = {
    name: " Amina W. ",
    role: "",
    rating: "5",
    text: "Got three interviews in two weeks.",
    source: "WhatsApp",
  };

  it("are published only with permission", () => {
    const review = newReviewSchema.parse({ ...form, consent: true });
    expect(review).toMatchObject({ name: "Amina W.", rating: 5 });
    expect(statusOfNewReview(review)).toBe("APPROVED");
    expect(statusOfNewReview({ consent: false })).toBe("HIDDEN");
  });

  it("need a rating and a real sentence", () => {
    expect(newReviewSchema.safeParse({ ...form, consent: true, rating: "" }).success).toBe(false);
    expect(newReviewSchema.safeParse({ ...form, consent: true, text: "Good" }).success).toBe(false);
  });
});

it("describes each move in plain words", () => {
  expect(describeMove("feature", "Amina")).toBe("put Amina's review on the homepage");
});
