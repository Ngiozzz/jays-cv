import { describe, expect, it } from "vitest";
import { checkCvProblem, cvCheckPrompt, cvFeedbackSchema, matchBand, PRETEND_FEEDBACK } from "./cv-check";

const job = {
  title: "HR & Admin Team Lead",
  company: "Kingdom Sacco",
  location: "Nairobi",
  summary: "Leads HR and administration.",
  responsibilities: ["Recruitment and selection"],
  requirements: ["Degree in HR", "5 years' experience"],
};

describe("cvCheckPrompt", () => {
  it("names the job and its requirements", () => {
    const prompt = cvCheckPrompt(job);
    expect(prompt).toContain("JOB: HR & Admin Team Lead at Kingdom Sacco (Nairobi)");
    expect(prompt).toContain("- Recruitment and selection");
    expect(prompt).toContain("- Degree in HR");
  });

  it("forbids writing a CV", () => {
    expect(cvCheckPrompt(job)).toContain("Never write, rewrite or return a CV");
  });

  it("copes with a job that lists nothing", () => {
    expect(cvCheckPrompt({ ...job, summary: "", responsibilities: [], requirements: [] })).toContain("- (not listed)");
  });
});

describe("what the client uploads", () => {
  it("takes a PDF or a photo up to 10 MB", () => {
    expect(checkCvProblem({ size: 50_000, type: "application/pdf" })).toBeNull();
    expect(checkCvProblem({ size: 50_000, type: "image/jpeg" })).toBeNull();
    expect(checkCvProblem(null)).toBe("Please upload your CV.");
    expect(checkCvProblem({ size: 11 * 1024 * 1024, type: "image/png" })).toMatch(/over 10 MB/);
  });

  it("asks for a PDF instead of a Word file", () => {
    expect(
      checkCvProblem({
        size: 50_000,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toMatch(/Save it as PDF/);
  });
});

describe("feedback", () => {
  it("the sample matches the shape the AI must return", () => {
    expect(cvFeedbackSchema.parse(PRETEND_FEEDBACK)).toEqual(PRETEND_FEEDBACK);
  });

  it("bands the match", () => {
    expect([matchBand(80).tone, matchBand(58).tone, matchBand(30).tone]).toEqual(["good", "fair", "low"]);
  });
});
