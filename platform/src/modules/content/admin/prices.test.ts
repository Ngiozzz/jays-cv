import { describe, expect, it } from "vitest";
import {
  describePackageChange,
  describeServiceChanges,
  packageSchema,
  revisionChoice,
  serviceSchema,
  toPackageTerms,
  type PackageTerms,
} from "./prices";

const professional: PackageTerms = {
  name: "Professional",
  price: 3000,
  bestFor: "Mid-level professionals",
  firstDraftHours: 24,
  revisionRounds: 2,
  revisionWindowDays: null,
  features: ["Tailored cover letter", "2 rounds of revisions"],
  popular: true,
  visible: true,
};

const form = {
  name: " Professional ",
  price: "3500",
  bestFor: "Mid-level professionals",
  firstDraftHours: "24",
  revisions: "unlimited",
  features: ["Tailored cover letter", "  ", "Unlimited revisions"],
  popular: false,
  visible: true,
};

describe("packageSchema", () => {
  it("tidies the form and drops empty lines", () => {
    expect(packageSchema.parse(form)).toMatchObject({
      name: "Professional",
      price: 3500,
      firstDraftHours: 24,
      features: ["Tailored cover letter", "Unlimited revisions"],
    });
  });

  it("refuses no price, part shillings, odd delivery times and no features", () => {
    expect(packageSchema.safeParse({ ...form, price: "" }).success).toBe(false);
    expect(packageSchema.safeParse({ ...form, price: "99.5" }).success).toBe(false);
    expect(packageSchema.safeParse({ ...form, firstDraftHours: "36" }).success).toBe(false);
    expect(packageSchema.safeParse({ ...form, features: ["", " "] }).success).toBe(false);
  });
});

describe("revisions", () => {
  it("stores unlimited as no round limit within a window of days", () => {
    const terms = toPackageTerms(packageSchema.parse(form), { revisionWindowDays: null });
    expect(terms).toMatchObject({ revisionRounds: null, revisionWindowDays: 14 });
    expect(toPackageTerms(packageSchema.parse(form), { revisionWindowDays: 30 }).revisionWindowDays).toBe(30);
    expect(revisionChoice(terms)).toBe("unlimited");
    expect(revisionChoice(professional)).toBe("2");
  });
});

describe("describePackageChange", () => {
  it("lists each change in plain words", () => {
    const after = toPackageTerms(packageSchema.parse(form), professional);
    expect(describePackageChange(professional, after)).toEqual([
      "price 3,000 → 3,500",
      "revisions 2 rounds → Unlimited (14 days)",
      'no longer "Most popular"',
      "description updated",
    ]);
  });

  it("is empty when nothing changed", () => {
    expect(describePackageChange(professional, { ...professional })).toEqual([]);
  });
});

describe("services", () => {
  it("validates each row", () => {
    expect(serviceSchema.parse({ id: "s1", note: " Per role ", price: "800", visible: true })).toEqual({
      id: "s1",
      note: "Per role",
      price: 800,
      visible: true,
    });
    expect(serviceSchema.safeParse({ id: "s1", note: "", price: "0", visible: true }).success).toBe(false);
  });

  it("describes price, visibility and wording changes", () => {
    const before = [{ name: "Cover letter", note: "One role", price: 800, visible: true }];
    expect(describeServiceChanges(before, [{ ...before[0], price: 1000, visible: false }])).toEqual([
      "Cover letter 800 → 1,000",
      "Cover letter hidden",
    ]);
  });
});
