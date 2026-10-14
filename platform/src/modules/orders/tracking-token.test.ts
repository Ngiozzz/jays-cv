import { describe, expect, it } from "vitest";
import {
  hashTrackingToken,
  looksLikeTrackingToken,
  newTrackingToken,
  openTrackingToken,
  sealTrackingToken,
} from "./tracking-token";

describe("tracking tokens", () => {
  it("are random, well formed, and stored only as a hash", () => {
    const tokens = new Set(Array.from({ length: 200 }, newTrackingToken));
    expect(tokens.size).toBe(200);
    for (const token of tokens) expect(looksLikeTrackingToken(token)).toBe(true);
    const [token] = tokens;
    expect(hashTrackingToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashTrackingToken(token)).not.toContain(token);
    expect(looksLikeTrackingToken("../../etc/passwd")).toBe(false);
  });

  it("can be sealed for staff and opened only with the same secret", () => {
    const token = newTrackingToken();
    const sealed = sealTrackingToken(token, "secret-one");
    expect(sealed).not.toContain(token);
    expect(openTrackingToken(sealed, "secret-one")).toBe(token);
    expect(openTrackingToken(sealed, "secret-two")).toBeNull();
    expect(openTrackingToken("garbage", "secret-one")).toBeNull();
  });
});
