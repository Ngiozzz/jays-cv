import { describe, expect, it } from "vitest";
import { EMPTY_JOB, type JobInput } from "@/modules/jobs/jobs.schema";
import { flagsFor, isClean, missingDetails, scamSigns, similar, type FlagContext } from "./inbox.flags";

const today = "2026-10-12";
const context: FlagContext = { today, rawText: "", unsure: [], checked: [], liveJobs: [], earlierPosters: [] };
const job = (patch: Partial<JobInput> = {}): JobInput => ({
  ...EMPTY_JOB,
  title: "Accounts Assistant",
  company: "Savanna Fresh Foods Ltd",
  location: "Nairobi",
  deadline: "2026-10-30",
  apply: { ...EMPTY_JOB.apply, method: "email", email: "careers@savannafresh.co.ke" },
  ...patch,
});
const keys = (j: JobInput, c: Partial<FlagContext> = {}) => flagsFor(j, { ...context, ...c }).map((f) => f.key);

describe("a complete poster", () => {
  it("has no flags and is clean", () => {
    expect(keys(job())).toEqual([]);
    expect(isClean(flagsFor(job(), context))).toBe(true);
  });
});

describe("scam checks", () => {
  const scamText =
    "URGENT!!! AIRPORT JOBS. NO EXPERIENCE NEEDED!! Pay registration fee of KES 1,500 via M-Pesa to 0700 000 000. Hurry!";

  it("needs two or more warning signs", () => {
    expect(scamSigns(scamText, "KES 85,000").length).toBeGreaterThanOrEqual(2);
    expect(keys(job({ salary: "KES 85,000" }), { rawText: scamText })).toContain("scam");
    expect(keys(job(), { rawText: "Urgent hiring! Send CV to careers@savannafresh.co.ke" })).not.toContain("scam");
  });
});

describe("duplicates", () => {
  it("matches the same company and a similar title, ignoring Ltd/Kenya", () => {
    expect(similar("Savanna Fresh Foods Ltd", "Savanna Fresh Foods Kenya")).toBe(true);
    expect(similar("Accounts Assistant", "Sales Manager")).toBe(false);
  });

  it("flags a job already on the website, or an earlier poster in the inbox", () => {
    const live = [{ title: "Accounts Assistant", company: "Savanna Fresh Foods", postedDay: "2026-10-10" }];
    expect(keys(job(), { liveJobs: live })).toEqual(["duplicate"]);
    expect(
      keys(job(), { earlierPosters: [{ title: "Accounts Assistant (2)", company: "Savanna Fresh Foods" }] }),
    ).toEqual(["duplicate"]);
  });
});

describe("deadlines", () => {
  it("flags a missing, passed or near deadline", () => {
    expect(keys(job({ deadline: null }))).toEqual(["no-deadline"]);
    expect(keys(job({ deadline: null, openEnded: true }))).toEqual([]);
    expect(keys(job({ deadline: "2026-10-01" }))).toEqual(["expired"]);
    expect(keys(job({ deadline: "2026-10-13" }))).toEqual(["closes-soon"]);
  });

  it("treats 'closes soon' as a note, not a problem", () => {
    expect(isClean(flagsFor(job({ deadline: "2026-10-13" }), context))).toBe(true);
  });
});

describe("unsure and missing fields", () => {
  it("asks for a check until the field is confirmed", () => {
    expect(keys(job(), { unsure: ["deadline"] })).toEqual(["unsure"]);
    expect(keys(job(), { unsure: ["deadline"], checked: ["deadline"] })).toEqual([]);
  });

  it("lists the details still needed, including where applications go", () => {
    expect(missingDetails(job({ company: "", apply: { ...EMPTY_JOB.apply, method: "link", url: "" } }))).toEqual([
      "Company",
      "How to apply",
    ]);
  });
});
