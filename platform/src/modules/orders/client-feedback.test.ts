import { describe, expect, it } from "vitest";
import {
  changeRequestSchema,
  changesFileProblem,
  clientRounds,
  isLowRating,
  reviewFormToInput,
  reviewSchema,
} from "./client-feedback";
import { DAY, type RuleOrder } from "./orders.rules";

const paidAt = new Date("2026-10-14T08:00:00Z");
const order = (patch: Partial<RuleOrder> = {}): RuleOrder => ({
  status: "DRAFT_SENT",
  createdAt: paidAt,
  paidAt,
  draftSentAt: paidAt,
  remindedAt: null,
  writerId: "w1",
  firstDraftHours: 24,
  extraHours: 0,
  revisionRounds: 3,
  revisionWindowDays: null,
  revisions: [],
  ...patch,
});

describe("clientRounds", () => {
  it("counts the change rounds left", () => {
    expect(clientRounds(order({ revisions: [paidAt] }), paidAt)).toEqual({ canAsk: true, left: 2, limit: 3 });
  });

  it("stops once every round is used", () => {
    expect(clientRounds(order({ revisionRounds: 1, revisions: [paidAt] }), paidAt)).toEqual({
      canAsk: false,
      reason: "You've used all 1 change round.",
    });
  });

  it("gives unlimited rounds until the change period ends", () => {
    const unlimited = order({ revisionRounds: null, revisionWindowDays: 14 });
    expect(clientRounds(unlimited, new Date(paidAt.getTime() + DAY))).toEqual({
      canAsk: true,
      until: new Date(paidAt.getTime() + 14 * DAY),
    });
    expect(clientRounds(unlimited, new Date(paidAt.getTime() + 15 * DAY))).toEqual({
      canAsk: false,
      reason: "Your 14-day change period has ended.",
    });
  });
});

describe("change requests", () => {
  it("needs a real note", () => {
    expect(changeRequestSchema.safeParse({ text: "  fix  " }).success).toBe(false);
    expect(changeRequestSchema.parse({ text: " Put my KCB job first. " })).toEqual({ text: "Put my KCB job first." });
  });

  it("accepts an optional document or photo up to 10 MB", () => {
    expect(changesFileProblem(null)).toBeNull();
    expect(changesFileProblem({ size: 2_000, type: "application/pdf" })).toBeNull();
    expect(changesFileProblem({ size: 2_000, type: "application/zip" })).toBe("Attach a PDF, Word document or photo.");
    expect(changesFileProblem({ size: 11 * 1024 * 1024, type: "image/jpeg" })).toMatch(/over 10 MB/);
  });
});

describe("reviews", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  };

  it("reads the review form", () => {
    const input = reviewFormToInput(
      form({ rating: "5", text: "Got 3 interview calls in a week!", name: " Mary W. ", role: "", consent: "on" }),
    );
    expect(reviewSchema.parse(input)).toEqual({
      rating: 5,
      text: "Got 3 interview calls in a week!",
      name: "Mary W.",
      role: null,
      consent: true,
    });
  });

  it("needs a star rating and a few words", () => {
    const result = reviewSchema.safeParse(reviewFormToInput(form({ rating: "", text: "ok", name: "Mary" })));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path[0]).sort()).toEqual(["rating", "text"]);
  });

  it("treats 1 and 2 stars as low", () => {
    expect([1, 2, 3, 5].map(isLowRating)).toEqual([true, true, false, false]);
  });
});
