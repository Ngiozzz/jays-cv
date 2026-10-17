import { describe, expect, it } from "vitest";
import { estimate } from "./AiProgress";

describe("estimate", () => {
  it("starts at 0, is about 85% at the usual time and never passes 95% while waiting", () => {
    expect(estimate(0, 20)).toBe(0);
    expect(estimate(20, 20)).toBe(82);
    expect(estimate(600, 20)).toBe(95);
  });
});
