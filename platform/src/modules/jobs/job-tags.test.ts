import { describe, expect, it } from "vitest";
import { allTagSlugs, jobsWithTag, sharedTags, tagName } from "./job-tags";
import { cleanTags, jobDraftSchema, tagSlug } from "./jobs.schema";

const accounts = { slug: "accounts", tags: ["CPA", "Accounting", "Nairobi"] };
const audit = { slug: "audit", tags: ["cpa", "Audit", "Entry level"] };
const driver = { slug: "driver", tags: ["Driver", "Mombasa"] };
const jobs = [accounts, audit, driver];

describe("tag addresses and tidying", () => {
  it("turns a tag into a web address", () => {
    expect(tagSlug("Entry level")).toBe("entry-level");
    expect(tagSlug("Finance & Accounting")).toBe("finance-and-accounting");
    expect(tagSlug("  #CPA! ")).toBe("cpa");
  });

  it("trims, drops repeats and blanks, and keeps at most 8", () => {
    expect(cleanTags([" CPA ", "cpa", "#Nairobi", "", "  ", "Entry   level"])).toEqual(["CPA", "Nairobi", "Entry level"]);
    expect(cleanTags(Array.from({ length: 12 }, (_, i) => `Tag ${i}`))).toHaveLength(8);
  });

  it("tidies tags typed on the form", () => {
    const job = jobDraftSchema.parse({ title: "Clerk", apply: {}, tags: ["CPA", " cpa", "Nairobi "] });
    expect(job.tags).toEqual(["CPA", "Nairobi"]);
  });
});

describe("tag pages", () => {
  it("lists the jobs carrying a tag, whatever its spelling", () => {
    expect(jobsWithTag(jobs, "cpa").map((job) => job.slug)).toEqual(["accounts", "audit"]);
    expect(jobsWithTag(jobs, "nurse")).toEqual([]);
  });

  it("names the page after the most used spelling, or the address when no job has it", () => {
    expect(tagName([...jobs, { tags: ["CPA"] }], "cpa")).toBe("CPA");
    expect(tagName(jobs, "entry-level")).toBe("Entry level");
    expect(tagName(jobs, "data-analyst")).toBe("Data analyst");
  });

  it("knows every tag in use, once", () => {
    expect(allTagSlugs(jobs).sort()).toEqual(["accounting", "audit", "cpa", "driver", "entry-level", "mombasa", "nairobi"]);
  });

  it("counts the tags two jobs share", () => {
    expect(sharedTags(accounts, audit)).toBe(1);
    expect(sharedTags(accounts, driver)).toBe(0);
  });
});
