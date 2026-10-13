import { describe, expect, it } from "vitest";
import {
  csvCell,
  owedAmount,
  parsePeriod,
  percentOf,
  periodStart,
  summarise,
  toCsv,
  writerShare,
} from "./finance.rules";
import { payoutSchema } from "./finance.schema";

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

describe("writer pay", () => {
  it("pays the writer their percent, rounded to whole shillings", () => {
    expect(writerShare(2500, 40, false)).toBe(1000);
    expect(writerShare(1999, 33, false)).toBe(660);
  });

  it("pays nothing when the owner wrote the CV", () => {
    expect(writerShare(2500, 40, true)).toBe(0);
  });

  it("never owes less than nothing", () => {
    expect(owedAmount(3000, 1000)).toBe(2000);
    expect(owedAmount(1000, 1500)).toBe(0);
  });
});

describe("summarise", () => {
  it("adds up takings, fees and packages, and works out what the owner keeps", () => {
    const result = summarise(
      [
        { amount: 2500, fee: 0, itemName: "Professional" },
        { amount: 1500, fee: 30, itemName: "Starter" },
        { amount: 2500, fee: 0, itemName: "Professional" },
      ],
      1000,
    );
    expect(result).toMatchObject({ takings: 6500, fees: 30, writerPay: 1000, keep: 5470 });
    expect(result.byPackage).toEqual([
      { name: "Professional", amount: 5000, count: 2 },
      { name: "Starter", amount: 1500, count: 1 },
    ]);
  });

  it("handles a period with no payments", () => {
    expect(summarise([], 0)).toMatchObject({ takings: 0, keep: 0, byPackage: [] });
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

describe("payoutSchema", () => {
  it("tidies the M-Pesa code and allows none", () => {
    expect(payoutSchema.parse({ amount: "1500", reference: " sjt7q2kx4m " })).toEqual({
      amount: 1500,
      reference: "SJT7Q2KX4M",
    });
    expect(payoutSchema.parse({ amount: 1500, reference: "" }).reference).toBe("");
  });

  it("refuses no amount, part shillings and a wrong code", () => {
    expect(payoutSchema.safeParse({ amount: "", reference: "" }).success).toBe(false);
    expect(payoutSchema.safeParse({ amount: "0", reference: "" }).success).toBe(false);
    expect(payoutSchema.safeParse({ amount: "10.5", reference: "" }).success).toBe(false);
    expect(payoutSchema.safeParse({ amount: "100", reference: "ABC" }).success).toBe(false);
  });
});
