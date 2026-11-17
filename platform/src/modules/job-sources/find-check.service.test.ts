import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/ai/claude", () => ({}));
vi.mock("@/modules/ai/tokens.service", () => ({}));
vi.mock("@/modules/ai/tokens.repo", () => ({}));
vi.mock("@/lib/tenant-db", () => ({}));

describe("trusting the known deadline", () => {
  it("never sets aside as closed a job whose deadline hasn't passed", async () => {
    const { trustDeadline } = await import("./find-check.service");
    const closed = { verdict: "closed" as const, reason: "Old advert" };
    expect(trustDeadline(closed, "2026-11-20", "2026-11-17").verdict).toBe("unsure");
    expect(trustDeadline(closed, "2026-11-17", "2026-11-17").verdict).toBe("unsure");
    expect(trustDeadline(closed, "2026-11-10", "2026-11-17")).toEqual(closed);
    // No deadline: the AI's judgement (e.g. "dated March") stands
    expect(trustDeadline(closed, null, "2026-11-17")).toEqual(closed);
    expect(trustDeadline({ verdict: "job", reason: "" }, "2026-11-20", "2026-11-17").verdict).toBe("job");
  });
});
