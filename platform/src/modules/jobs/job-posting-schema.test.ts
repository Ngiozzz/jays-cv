import { describe, expect, it } from "vitest";
import { jobPostingSchema, jsonLd } from "./job-posting-schema";

const job = {
  title: "I.T Specialist",
  company: "Kilimall",
  location: "Nairobi",
  workMode: "On-site",
  type: "Full-time",
  summary: "Run IT operations.",
  responsibilities: ["Keep the network up"],
  requirements: ["Degree <IT>"],
  deadline: "2026-11-05",
  postedDay: "2026-10-12",
};

describe("jobPostingSchema", () => {
  it("describes the job the way Google for Jobs expects", () => {
    const data = jobPostingSchema(job, "https://jaycvs.co.ke/jobs/it-specialist-kilimall");
    expect(data).toMatchObject({
      "@type": "JobPosting",
      title: "I.T Specialist",
      datePosted: "2026-10-12",
      validThrough: "2026-11-05T23:59:59+03:00",
      employmentType: "FULL_TIME",
      hiringOrganization: { name: "Kilimall" },
      jobLocation: { address: { addressLocality: "Nairobi", addressCountry: "KE" } },
    });
    expect(data.description).toContain("<li>Degree &lt;IT&gt;</li>");
  });

  it("marks remote jobs and leaves out a missing deadline", () => {
    const data = jobPostingSchema({ ...job, workMode: "Remote", deadline: null }, "https://x");
    expect(data).toMatchObject({ jobLocationType: "TELECOMMUTE" });
    expect(data).not.toHaveProperty("validThrough");
  });
});

describe("jsonLd", () => {
  it("can't be broken out of by job text", () => {
    expect(jsonLd({ title: "</script><script>alert(1)" })).not.toContain("</script>");
  });
});
