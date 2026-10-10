import { describe, expect, it } from "vitest";
import { lowestPrice, priceByName, standardDraftHours } from "./pricing";

describe("lowestPrice", () => {
  it("finds the cheapest item, or null when empty", () => {
    expect(lowestPrice([{ price: 3000 }, { price: 1500 }])).toBe(1500);
    expect(lowestPrice([])).toBeNull();
  });
});

describe("priceByName", () => {
  it("looks a service up by name", () => {
    const services = [{ name: "Cover letter", price: 800 }];
    expect(priceByName(services, "Cover letter")).toBe(800);
    expect(priceByName(services, "Mock interview")).toBeNull();
  });
});

describe("standardDraftHours", () => {
  it("promises the slowest package's time", () => {
    expect(standardDraftHours([{ firstDraftHours: 24 }, { firstDraftHours: 48 }])).toBe(48);
    expect(standardDraftHours([])).toBe(48);
  });
});
