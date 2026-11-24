import { describe, expect, it } from "vitest";
import { splitCount } from "./count-up";

const at = (value: string, n: number) => {
  const parts = splitCount(value)!;
  return parts.prefix + parts.format(n) + parts.suffix;
};

describe("splitCount", () => {
  it("keeps what comes before and after the number", () => {
    expect(splitCount("48 hrs")).toMatchObject({ prefix: "", target: 48, suffix: " hrs" });
    expect(splitCount("KES 1,500")).toMatchObject({ prefix: "KES ", target: 1500, suffix: "" });
  });

  it("counts with the same commas and decimal places as the real value", () => {
    expect(at("2,000+", 0)).toBe("0+");
    expect(at("2,000+", 1234.6)).toBe("1,235+");
    expect(at("2,000+", 2000)).toBe("2,000+");
    expect(at("4.9/5", 2.345)).toBe("2.3/5");
    expect(at("8", 8)).toBe("8");
  });

  it("leaves a fact without a number alone", () => {
    expect(splitCount("Nairobi")).toBeNull();
  });
});
