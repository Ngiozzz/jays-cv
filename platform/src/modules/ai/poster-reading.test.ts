import { describe, expect, it } from "vitest";
import { PRETEND_READING, parsePosterReading, posterReadingSchema, readingToJobInput } from "./poster-reading";

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

describe("parsePosterReading", () => {
  it("keeps a good answer as it is", () => {
    expect(parsePosterReading(PRETEND_READING)).toEqual(PRETEND_READING);
  });

  it("replaces stray choices with safe ones and flags them for a person to check", () => {
    const reading = parsePosterReading({
      ...PRETEND_READING,
      type: "",
      workMode: "Onsite",
      applyMethod: "post",
      attach: ["CV", "Passport photo"],
      unsureFields: ["salary", "title", "responsibilities"],
    });
    expect(reading).toMatchObject({ type: "Full-time", workMode: "On-site", applyMethod: "other", attach: ["CV"] });
    expect(reading?.unsureFields).toEqual(["title", "type", "workMode", "apply"]);
    expect(posterReadingSchema.safeParse(reading).success).toBe(true);
  });

  it("tidies the tags and treats a missing scam opinion as low", () => {
    const reading = parsePosterReading({
      ...PRETEND_READING,
      tags: ["CPA", "cpa", 7, " Nairobi ", "SACCO jobs Kenya", "Kenya jobs"],
      scamRisk: "maybe",
    });
    expect(reading).toMatchObject({ tags: ["CPA", "Nairobi", "SACCO"], scamRisk: "low" });
    expect(readingToJobInput(reading!).tags).toEqual(["CPA", "Nairobi", "SACCO"]);
  });

  it("fills missing fields with blanks and refuses an answer that isn't an object", () => {
    expect(parsePosterReading({ isJobAdvert: false })).toMatchObject({ isJobAdvert: false, title: "", requirements: [] });
    expect(parsePosterReading("sorry")).toBeNull();
  });
});
