import { describe, expect, it } from "vitest";
import { PRETEND_READING, posterReadingSchema, readingToJobInput } from "./poster-reading";

describe("readingToJobInput", () => {
  it("turns a poster reading into job form values", () => {
    const job = readingToJobInput({ ...PRETEND_READING, deadline: "2026-11-05" });
    expect(job).toMatchObject({
      title: "I.T Specialist",
      company: "Kilimall",
      category: "IT & Tech",
      deadline: "2026-11-05",
      openEnded: false,
      apply: { method: "email", email: "recruitment@kilimall.com", attach: ["CV", "Cover letter"] },
    });
  });

  it("treats a missing or garbled deadline as open until filled", () => {
    expect(readingToJobInput({ ...PRETEND_READING, deadline: "" })).toMatchObject({ deadline: null, openEnded: true });
    expect(readingToJobInput({ ...PRETEND_READING, deadline: "Friday" })).toMatchObject({ deadline: null });
  });

  it("drops unknown categories and blank list items", () => {
    const job = readingToJobInput({ ...PRETEND_READING, category: "Unknown", requirements: ["  ", "Degree"] });
    expect(job.category).toBe("");
    expect(job.requirements).toEqual(["Degree"]);
  });
});

describe("posterReadingSchema", () => {
  it("accepts the pretend reading", () => {
    expect(posterReadingSchema.safeParse(PRETEND_READING).success).toBe(true);
  });
});
