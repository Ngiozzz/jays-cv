import { describe, expect, it } from "vitest";
import { aiStopped, memberAiStop, parseAllowance, tokenBalance, tokenPace, usageByDay } from "./tokens";

describe("tokenBalance", () => {
  it("works out what is left", () => {
    expect(tokenBalance(600_000, 1_000_000, 20)).toEqual({
      remaining: 600_000,
      granted: 1_000_000,
      percentLeft: 60,
      low: false,
      paused: false,
    });
  });

  it("warns at or below the owner's warning level", () => {
    expect(tokenBalance(200_000, 1_000_000, 20).low).toBe(true);
    expect(tokenBalance(0, 0, 20)).toMatchObject({ percentLeft: 0, low: true });
  });
});

describe("aiStopped", () => {
  it("stops the AI when paused, even with tokens left", () => {
    expect(aiStopped(tokenBalance(600_000, 1_000_000, 20, true))).toBe("paused");
  });

  it("stops the AI when the tokens run out", () => {
    expect(aiStopped(tokenBalance(0, 1_000_000, 20))).toBe("empty");
    expect(aiStopped(tokenBalance(1, 1_000_000, 20))).toBeNull();
  });
});

describe("memberAiStop", () => {
  const writer = { role: "WRITER" as const, aiEnabled: true, aiAllowance: 200_000 };

  it("never stops the owner", () => {
    expect(memberAiStop({ role: "OWNER", aiEnabled: false, aiAllowance: 0 }, 1_000, false)).toBeNull();
  });

  it("stops someone the AI is switched off for", () => {
    expect(memberAiStop({ ...writer, aiEnabled: false }, 0, true)).toBe("off");
  });

  it("stops a used-up allowance only when the shared pool isn't open to them", () => {
    expect(memberAiStop(writer, 199_999, false)).toBeNull();
    expect(memberAiStop(writer, 200_000, false)).toBe("allowance");
    expect(memberAiStop(writer, 200_000, true)).toBeNull();
  });

  it("puts no limit on someone without an allowance of their own", () => {
    expect(memberAiStop({ ...writer, aiAllowance: null }, 5_000_000, false)).toBeNull();
  });
});

describe("tokenPace", () => {
  it("works out the daily pace and how long the rest lasts", () => {
    expect(tokenPace(400_000, 600_000, 20)).toEqual({ perDay: 30_000, daysLeft: 13 });
    expect(tokenPace(400_000, 0, 1)).toEqual({ perDay: 0, daysLeft: null });
  });
});

describe("usageByDay", () => {
  it("adds up each Nairobi day of the month, with quiet days as zero", () => {
    const monthStart = new Date("2026-10-31T21:00:00Z"); // 1 Nov, midnight in Nairobi
    const now = new Date("2026-11-03T08:00:00Z");
    const days = usageByDay(
      [
        { delta: -100, createdAt: new Date("2026-10-31T22:00:00Z") }, // 1 Nov, 01:00 Nairobi
        { delta: -50, createdAt: new Date("2026-11-01T20:59:00Z") }, // 1 Nov, 23:59 Nairobi
        { delta: -30, createdAt: new Date("2026-11-03T07:00:00Z") },
      ],
      monthStart,
      now,
    );
    expect(days).toEqual([
      { day: "2026-11-01", tokens: 150 },
      { day: "2026-11-02", tokens: 0 },
      { day: "2026-11-03", tokens: 30 },
    ]);
  });
});

describe("parseAllowance", () => {
  it("reads typed numbers, and empty as no limit", () => {
    expect(parseAllowance("200,000")).toEqual({ ok: true, allowance: 200_000 });
    expect(parseAllowance(" ")).toEqual({ ok: true, allowance: null });
    expect(parseAllowance("2.5k").ok).toBe(false);
  });
});
