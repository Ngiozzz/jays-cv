import { describe, expect, it } from "vitest";
import { companyKey, logoCoverage, logoPath, logoProblem } from "./companies";

describe("companyKey", () => {
  it("ignores case and extra spaces", () => {
    expect(companyKey("  Kilimall   Kenya ")).toBe("kilimall kenya");
    expect(companyKey("KILIMALL KENYA")).toBe(companyKey("kilimall kenya"));
  });
});

describe("logoProblem", () => {
  it("accepts small images and refuses others", () => {
    expect(logoProblem({ type: "image/png", size: 12_000 })).toBeNull();
    expect(logoProblem({ type: "image/svg+xml", size: 1000 })).toMatch(/PNG, JPG or WebP/);
    expect(logoProblem({ type: "image/png", size: 2 * 1024 * 1024 })).toMatch(/too large/);
  });
});

describe("logoPath", () => {
  it("files logos under the business and the company", () => {
    expect(logoPath("t1", "c1", "image/png", "abc")).toBe("t1/c1/abc.png");
  });
});

describe("logoCoverage", () => {
  it("weights coverage by how many jobs each company posts", () => {
    expect(
      logoCoverage([
        { hasLogo: true, jobCount: 6 },
        { hasLogo: false, jobCount: 3 },
        { hasLogo: false, jobCount: 1 },
      ]),
    ).toEqual({ companies: 3, withLogo: 1, jobsCoveredPct: 60 });
    expect(logoCoverage([])).toEqual({ companies: 0, withLogo: 0, jobsCoveredPct: 0 });
  });
});
