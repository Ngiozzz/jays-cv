import { describe, expect, it } from "vitest";
import { tokenRequestSchema } from "./token-requests";

describe("tokenRequestSchema", () => {
  it("takes one of the offered amounts and an optional note", () => {
    expect(tokenRequestSchema.parse({ tokens: "1000000", note: "  Busy week  " })).toEqual({
      tokens: 1_000_000,
      note: "Busy week",
    });
    expect(tokenRequestSchema.parse({ tokens: "500000", note: "" })).toEqual({ tokens: 500_000, note: null });
  });

  it("refuses an amount that isn't offered, or a note that's too long", () => {
    expect(tokenRequestSchema.safeParse({ tokens: "123", note: "" }).success).toBe(false);
    expect(tokenRequestSchema.safeParse({ tokens: "", note: "" }).success).toBe(false);
    expect(tokenRequestSchema.safeParse({ tokens: "1000000", note: "x".repeat(201) }).success).toBe(false);
  });
});
