import { describe, expect, it } from "vitest";
import { PRETEND_READING, readingToJobInput } from "./poster-reading";
import { readingReport } from "./reading-report";

const keys = (items: { key: string }[]) => items.map((item) => item.key);

describe("readingReport", () => {
  it("lists what the AI filled in and what the poster didn't say", () => {
    const report = readingReport(readingToJobInput(PRETEND_READING), []);
    expect(keys(report.filled)).toEqual([
      "title",
      "company",
      "location",
      "category",
      "type",
      "workMode",
      "summary",
      "responsibilities",
      "requirements",
      "tags",
      "apply",
    ]);
    expect(keys(report.missing)).toEqual(["salary", "deadline"]);
    expect(report.unsure).toEqual([]);
  });

  it("marks what's needed to publish and treats Not specified as missing", () => {
    const job = readingToJobInput({ ...PRETEND_READING, company: "", location: "", applyEmail: "", notes: "" });
    const missing = readingReport(job, []).missing;
    expect(keys(missing)).toEqual(["company", "location", "salary", "deadline", "apply"]);
    expect(missing.filter((item) => item.needed).map((item) => item.key)).toEqual(["company", "apply"]);
  });

  it("puts fields the AI wasn't sure about in their own list", () => {
    const report = readingReport(readingToJobInput(PRETEND_READING), ["company", "deadline"]);
    expect(keys(report.unsure)).toEqual(["company", "deadline"]);
    expect(keys(report.filled)).not.toContain("company");
    expect(keys(report.missing)).toEqual(["salary"]);
  });
});
