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

describe("other amount", () => {
  it("takes a typed amount in range, with commas or spaces", async () => {
    const { tokenRequestFormToInput, tokenRequestSchema } = await import("./token-requests");
    const form = (tokens: string, other = "") => {
      const data = new FormData();
      data.set("tokens", tokens);
      data.set("otherTokens", other);
      data.set("note", "");
      return tokenRequestSchema.safeParse(tokenRequestFormToInput(data));
    };
    expect(form("other", "3,000,000").data?.tokens).toBe(3_000_000);
    expect(form("other", "1 500 000").data?.tokens).toBe(1_500_000);
    expect(form("2000000").data?.tokens).toBe(2_000_000);
    expect(form("other", "50").success).toBe(false);
    expect(form("other", "999999999").success).toBe(false);
    expect(form("other", "").success).toBe(false);
    expect(form("other", "1.5").success).toBe(false);
  });
});
