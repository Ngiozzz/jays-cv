import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/ai/tokens.service", () => ({}));
vi.mock("@/modules/inbox/inbox.repo", () => ({}));
vi.mock("@/modules/inbox/inbox.service", () => ({}));
vi.mock("@/modules/tenants/tenants.repo", () => ({}));
vi.mock("./job-sources.service", () => ({}));
vi.mock("./find-check.service", () => ({}));
vi.mock("./job-sources.repo", () => ({}));

describe("the morning run's day", () => {
  it("starts at midnight in Nairobi", async () => {
    const { startOfNairobiDay } = await import("./morning.service");
    // 02:00 UTC = 05:00 in Nairobi on the 17th
    expect(startOfNairobiDay(new Date("2026-11-17T02:00:00Z")).toISOString()).toBe("2026-11-16T21:00:00.000Z");
    // 22:30 UTC on the 16th is already the 17th in Nairobi
    expect(startOfNairobiDay(new Date("2026-11-16T22:30:00Z")).toISOString()).toBe("2026-11-16T21:00:00.000Z");
  });
});
