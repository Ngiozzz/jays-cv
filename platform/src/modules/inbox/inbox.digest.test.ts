import { describe, expect, it } from "vitest";
import { dailyDigest } from "./inbox.digest";

const site = "https://jaycvs.co.ke";

describe("dailyDigest", () => {
  it("lists today's jobs with deadlines and links", () => {
    const post = dailyDigest(
      [
        { title: "Accounts Assistant", company: "Savanna", location: "Nairobi", deadline: "2026-10-24", slug: "a" },
        { title: "Teacher", company: "Tumaini", location: "Nakuru", deadline: null, slug: "b" },
      ],
      "2026-10-12",
      site,
    );
    expect(post).toContain("*NEW JOBS TODAY* (12 Oct 2026)");
    expect(post).toContain(
      "1. *Accounts Assistant*: Savanna, Nairobi\n⏳ Deadline: 24 Oct 2026\n👉 https://jaycvs.co.ke/jobs/a",
    );
    expect(post).toContain("2. *Teacher*: Tumaini, Nakuru\n⏳ Open until filled");
    expect(post).toContain("All open jobs: https://jaycvs.co.ke/jobs");
  });

  it("is empty when nothing was approved", () => {
    expect(dailyDigest([], "2026-10-12", site)).toBe("");
  });
});
