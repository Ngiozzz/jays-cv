import { describe, expect, it } from "vitest";
import { csvCell, parsePeriod, percentOf, periodStart, summarise, toCsv } from "./finance.rules";

describe("periodStart", () => {
  it("starts this month at midnight Nairobi time", () => {
    // 1 Oct, 01:00 in Nairobi is still 30 Sep in UTC
    expect(periodStart("month", new Date("2026-09-30T22:00:00Z"))?.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(periodStart("month", new Date("2026-10-13T09:00:00Z"))?.toISOString()).toBe("2026-09-30T21:00:00.000Z");
  });

  it("goes back 30 days, or has no start for all time", () => {
    expect(periodStart("30", new Date("2026-10-31T00:00:00Z"))?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(periodStart("all")).toBeNull();
  });

  it("falls back to this month for anything unknown", () => {
    expect(parsePeriod("30")).toBe("30");
    expect(parsePeriod("year")).toBe("month");
    expect(parsePeriod(undefined)).toBe("month");
  });
});

describe("summarise", () => {
  it("adds up takings, fees and packages, the average order, and what the owner keeps", () => {
    const result = summarise([
      { amount: 2500, fee: 0, itemName: "Professional" },
      { amount: 1500, fee: 30, itemName: "Starter" },
      { amount: 2500, fee: 0, itemName: "Professional" },
    ]);
    // Writers are salaried: nothing per CV comes off what the owner keeps
    expect(result).toMatchObject({ takings: 6500, fees: 30, keep: 6470, average: 2167 });
    expect(result.byPackage).toEqual([
      { name: "Professional", amount: 5000, count: 2 },
      { name: "Starter", amount: 1500, count: 1 },
    ]);
  });

  it("handles a period with no payments", () => {
    expect(summarise([])).toMatchObject({ takings: 0, keep: 0, average: 0, byPackage: [] });
    expect(percentOf(0, 0)).toBe(0);
  });
});

describe("CSV", () => {
  it("quotes cells and stops Excel running formulas", () => {
    expect(csvCell('Jane "JJ" Doe')).toBe('"Jane ""JJ"" Doe"');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(toCsv([["a", 1]])).toBe('﻿"a","1"\r\n');
  });
});
