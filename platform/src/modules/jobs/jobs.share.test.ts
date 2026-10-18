import { describe, expect, it } from "vitest";
import { channelPost } from "./jobs.share";
import { jobDraftSchema } from "./jobs.schema";

const links = { job: "https://jaycvs.co.ke/jobs/it-specialist-kilimall", services: "https://jaycvs.co.ke/services" };

describe("channelPost", () => {
  it("writes the WhatsApp channel post", () => {
    const job = jobDraftSchema.parse({
      title: "I.T Specialist",
      company: "Kilimall",
      counties: ["Nairobi"],
      deadline: "2026-11-05",
      apply: {
        method: "email",
        email: "recruitment@kilimall.com",
        subject: "IT SPECIALIST",
        attach: ["CV", "Cover letter"],
      },
    });
    expect(channelPost(job, links)).toBe(
      [
        "🔥 *I.T SPECIALIST*",
        "🏢 Kilimall",
        "📍 Nairobi County · Full-time",
        "⏳ Deadline: 5 Nov 2026",
        "📧 Apply: send CV & Cover letter to recruitment@kilimall.com (Subject: IT SPECIALIST)",
        "",
        "👉 Full details: https://jaycvs.co.ke/jobs/it-specialist-kilimall",
        "",
        "✍🏾 Is your CV ready? Get one that gets you shortlisted: https://jaycvs.co.ke/services",
      ].join("\n"),
    );
  });

  it("covers open-ended jobs and online applications", () => {
    const job = jobDraftSchema.parse({
      title: "Nurse",
      company: "Avenue",
      counties: ["Kisumu"],
      salary: "KES 60,000",
      openEnded: true,
      apply: { method: "link", url: "https://avenue.co.ke/careers" },
    });
    const post = channelPost(job, links);
    expect(post).toContain("💰 KES 60,000");
    expect(post).toContain("⏳ Deadline: Open until filled");
    expect(post).toContain("🔗 Apply online: https://avenue.co.ke/careers");
  });
});
