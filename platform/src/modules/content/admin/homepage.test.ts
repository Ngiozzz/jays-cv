import { describe, expect, it } from "vitest";
import { describeHomepageChanges, homepageFormToInput, homepageSchema, type StoredHomepage } from "./homepage";

const before: StoredHomepage = {
  headline: "CVs that get you",
  highlight: "shortlisted.",
  lead: "Professionally written CVs, cover letters and LinkedIn profiles.",
  stats: [
    { value: "2,000+", label: "CVs written" },
    { value: "8", label: "Years in HR" },
    { value: "48 hrs", label: "Average turnaround" },
    { value: "4.9/5", label: "Average client rating" },
  ],
  announcementOn: false,
  announcementText: "December offer",
  announcementLink: "/pricing",
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe("homepageSchema", () => {
  it("reads the form and tidies the text", () => {
    const fields: Record<string, string> = {
      headline: " CVs that get you ",
      highlight: "hired.",
      lead: before.lead,
      announcementOn: "on",
      announcementText: "New: LinkedIn revamps",
      announcementLink: "https://wa.me/254700000000",
    };
    before.stats.forEach((stat, i) => {
      fields[`stat-value-${i}`] = stat.value;
      fields[`stat-label-${i}`] = stat.label;
    });
    const home = homepageSchema.parse(homepageFormToInput(form(fields)));
    expect(home.headline).toBe("CVs that get you");
    expect(home.announcementOn).toBe(true);
    expect(home.stats).toEqual(before.stats);
  });

  it("needs a message when the announcement is on, and a safe link", () => {
    const result = homepageSchema.safeParse({
      ...before,
      announcementOn: true,
      announcementText: "",
      announcementLink: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["announcementText", "announcementLink"]));
    }
    expect(homepageSchema.safeParse({ ...before, announcementLink: "//evil.example" }).success).toBe(false);
    expect(homepageSchema.safeParse({ ...before, announcementLink: "/pricing#individual" }).success).toBe(true);
  });
});

describe("describeHomepageChanges", () => {
  it("names each part that changed", () => {
    const after = {
      ...before,
      highlight: "hired.",
      stats: [{ value: "3,000+", label: "CVs written" }, ...before.stats.slice(1)],
      announcementOn: true,
    };
    expect(describeHomepageChanges(before, after)).toEqual([
      "changed the headline",
      "changed the numbers strip",
      "turned on the announcement bar",
    ]);
    expect(describeHomepageChanges(before, before)).toEqual([]);
  });
});
