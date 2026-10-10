import { describe, expect, it } from "vitest";
import { assertWholeShillings, formatKes } from "./money";

describe("formatKes", () => {
  it("groups thousands", () => {
    expect(formatKes(1500)).toBe("KES 1,500");
    expect(formatKes(0)).toBe("KES 0");
  });
});

describe("assertWholeShillings", () => {
  it("accepts whole amounts and rejects fractions or negatives", () => {
    expect(assertWholeShillings(3000)).toBe(3000);
    expect(() => assertWholeShillings(99.5)).toThrow();
    expect(() => assertWholeShillings(-1)).toThrow();
  });
});
