import { describe, expect, it } from "vitest";
import { jobDraftSchema, jobFormToInput, previewOf, publishProblems } from "./jobs.schema";

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(name, v);
  }
  return data;
}

const complete = {
  title: "I.T Specialist",
  company: "Kilimall",
  location: "Nairobi",
  category: "IT & Tech",
  type: "Full-time",
  workMode: "On-site",
  responsibilities: "- Keep the network running\n\n• Support staff",
  deadline: "2026-11-01",
  applyMethod: "email",
  applyEmail: "recruitment@kilimall.com",
  applyAttach: ["CV", "Cover letter"],
};

describe("jobFormToInput + jobDraftSchema", () => {
  it("reads one item per line, without bullets or blanks", () => {
    const job = jobDraftSchema.parse(jobFormToInput(form(complete)));
    expect(job.responsibilities).toEqual(["Keep the network running", "Support staff"]);
    expect(job.apply.attach).toEqual(["CV", "Cover letter"]);
  });

  it("lets a draft be saved with just a title", () => {
    const result = jobDraftSchema.safeParse(jobFormToInput(form({ title: "Nurse" })));
    expect(result.success).toBe(true);
  });

  it("needs a title even for a draft", () => {
    expect(jobDraftSchema.safeParse(jobFormToInput(form({ title: " " }))).success).toBe(false);
  });

  it("drops the deadline when the job is open until filled", () => {
    const job = jobDraftSchema.parse(jobFormToInput(form({ ...complete, openEnded: "on" })));
    expect(job.deadline).toBeNull();
    expect(job.openEnded).toBe(true);
  });
});

describe("publishProblems", () => {
  it("accepts a complete job", () => {
    expect(publishProblems(jobDraftSchema.parse(jobFormToInput(form(complete))))).toEqual([]);
  });

  it("lists everything missing before a job can go live", () => {
    const job = jobDraftSchema.parse(jobFormToInput(form({ title: "Nurse", applyMethod: "link" })));
    expect(publishProblems(job).map((p) => p.path)).toEqual(["company", "location", "deadline", "apply.url"]);
  });

  it("checks the email and link look real", () => {
    const badEmail = jobDraftSchema.parse(jobFormToInput(form({ ...complete, applyEmail: "not-an-email" })));
    expect(publishProblems(badEmail)).toEqual([
      { path: "apply.email", message: "That email address doesn't look right" },
    ]);
    const badLink = jobDraftSchema.parse(
      jobFormToInput(form({ ...complete, applyMethod: "link", applyUrl: "careers page" })),
    );
    expect(publishProblems(badLink)[0]?.path).toBe("apply.url");
  });
});

describe("previewOf", () => {
  it("follows the other fields even before a title is typed", () => {
    const preview = previewOf(form({ company: "Kilimall", location: "Nairobi" }));
    expect(preview).toMatchObject({ title: "", company: "Kilimall", location: "Nairobi" });
  });
});
