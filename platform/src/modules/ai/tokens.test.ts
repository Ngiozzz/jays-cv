import { describe, expect, it } from "vitest";
import { tokenBalance } from "./tokens";

describe("tokenBalance", () => {
  it("works out what is left", () => {
    expect(tokenBalance(600_000, 1_000_000, 20)).toEqual({
      remaining: 600_000,
      granted: 1_000_000,
      percentLeft: 60,
      low: false,
    });
  });

  it("warns at or below the owner's warning level", () => {
    expect(tokenBalance(200_000, 1_000_000, 20).low).toBe(true);
    expect(tokenBalance(0, 0, 20)).toMatchObject({ percentLeft: 0, low: true });
  });
});
