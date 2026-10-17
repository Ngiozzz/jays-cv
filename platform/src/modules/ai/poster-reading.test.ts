import { describe, expect, it } from "vitest";
import {
  PRETEND_READING,
  cleanLocation,
  extraTexts,
  parsePosterAnswer,
  parsePosterReading,
  posterPrompt,
  posterReadingSchema,
  readingToJobInput,
} from "./poster-reading";

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
    expect(parsePosterReading({ isJobAdvert: false })).toMatchObject({
      isJobAdvert: false,
      title: "",
      requirements: [],
    });
    expect(parsePosterReading("sorry")).toBeNull();
  });

  it('says "Not specified" when the poster gives no location', () => {
    expect(parsePosterReading({ ...PRETEND_READING, location: "" })?.location).toBe("Not specified");
    expect(parsePosterReading({ ...PRETEND_READING, location: "Kericho" })?.location).toBe("Kericho");
  });
});

describe("cleanLocation", () => {
  it("turns vague answers into Not specified and keeps real places", () => {
    for (const vague of ["", "  ", "N/A", "unknown", "Not stated", "Kenya", "-"]) {
      expect(cleanLocation(vague)).toBe("Not specified");
    }
    expect(cleanLocation(" Nairobi (Westlands) ")).toBe("Nairobi (Westlands)");
  });
});

describe("parsePosterAnswer", () => {
  const { isJobAdvert, rawText, scamRisk, scamReason, ...job } = PRETEND_READING;

  it("gives each job on the poster its own reading, with the advert's shared answers", () => {
    const answer = parsePosterAnswer({
      isJobAdvert,
      rawText,
      scamRisk: "medium",
      scamReason: "Odd",
      jobs: [job, { ...job, title: "Risk Associate", type: "Contract" }],
    });
    expect(answer?.jobs.map((j) => j.title)).toEqual(["I.T Specialist", "Risk Associate"]);
    expect(answer?.jobs[1]).toMatchObject({ scamRisk: "medium", rawText, type: "Contract" });
  });

  it("reads an answer without a jobs list as one job, and no jobs as not an advert", () => {
    expect(parsePosterAnswer(PRETEND_READING)?.jobs).toHaveLength(1);
    expect(parsePosterAnswer({ isJobAdvert: true, rawText: "", jobs: [] })?.isJobAdvert).toBe(false);
    expect(parsePosterAnswer(null)).toBeNull();
  });

  it("keeps at most ten jobs", () => {
    expect(parsePosterAnswer({ isJobAdvert, rawText, jobs: Array(12).fill(job) })?.jobs).toHaveLength(10);
  });
});

describe("extraTexts", () => {
  it("passes the caption and each page, and says which links couldn't be opened", () => {
    const texts = extraTexts({
      caption: "Apply: https://lnkd.in/a",
      pages: [
        { url: "https://lnkd.in/a", finalUrl: "https://careers.example.com/1", text: "Duties: support", reason: null },
        { url: "https://lnkd.in/b", finalUrl: null, text: null, reason: "the site took too long to answer" },
      ],
    });
    expect(texts[0]).toContain("Apply: https://lnkd.in/a");
    expect(texts[1]).toContain("Real address: https://careers.example.com/1");
    expect(texts[2]).toBe("LINK https://lnkd.in/b could not be opened (the site took too long to answer).");
    expect(extraTexts(null)).toEqual([]);
  });

  it("only mentions the extra text in the instructions when there is some", () => {
    expect(posterPrompt("2026-10-16")).not.toContain("advert content only");
    expect(posterPrompt("2026-10-16", { caption: "Apply here", pages: [] })).toContain("advert content only");
  });
});
