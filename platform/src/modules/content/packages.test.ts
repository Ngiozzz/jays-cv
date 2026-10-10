import { describe, expect, it } from "vitest";
import { draftTimeLabel, forWhomSentence, revisionsLabel } from "./packages";

describe("revisionsLabel", () => {
  it("counts rounds", () => {
    expect(revisionsLabel({ revisionRounds: 1, revisionWindowDays: null })).toBe("1 round");
    expect(revisionsLabel({ revisionRounds: 2, revisionWindowDays: null })).toBe("2 rounds");
  });

  it("explains unlimited revisions", () => {
    expect(revisionsLabel({ revisionRounds: null, revisionWindowDays: 14 })).toBe("Unlimited (14 days)");
  });
});

describe("draftTimeLabel", () => {
  it("uses hours up to two days, then days", () => {
    expect(draftTimeLabel(24)).toBe("24 hours");
    expect(draftTimeLabel(48)).toBe("48 hours");
    expect(draftTimeLabel(72)).toBe("3 days");
  });
});

describe("forWhomSentence", () => {
  it("reads as a sentence", () => {
    expect(forWhomSentence("Mid-level professionals")).toBe("For mid-level professionals.");
  });
});
