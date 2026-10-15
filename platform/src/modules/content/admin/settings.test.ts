import { describe, expect, it } from "vitest";
import { describeSettingsChanges, settingsSchema, type StoredSettings } from "./settings";

const before: StoredSettings = {
  whatsapp: "0725 912 186",
  email: "info@jaycvs.co.ke",
  address: "Moi Avenue, Nairobi, Kenya",
  channelLink: null,
  linkedinUrl: null,
  facebookUrl: null,
  instagramUrl: null,
  xUrl: null,
  unpaidHours: 24,
  reminderDays: 2,
  autoCompleteDays: 5,
  revisionHours: 24,
  deleteAbandonedDays: 30,
  retentionMonths: 6,
  posterRetentionMonths: 3,
  aiWarnPct: 20,
  paybill: "4027127",
};

// What the form sends: everything as text
const asForm = (settings: StoredSettings) =>
  Object.fromEntries(Object.entries(settings).map(([name, value]) => [name, value === null ? "" : String(value)]));

describe("settingsSchema", () => {
  it("reads the form's text into settings", () => {
    const parsed = settingsSchema.parse({
      ...asForm(before),
      email: " Info@JayCVs.co.ke ",
      paybill: "402 7127",
      linkedinUrl: "https://www.linkedin.com/company/jaycvs",
    });
    expect(parsed).toEqual({
      ...before,
      email: "info@jaycvs.co.ke",
      linkedinUrl: "https://www.linkedin.com/company/jaycvs",
    });
  });

  it("refuses numbers and links that would break the website", () => {
    const result = settingsSchema.safeParse({
      ...asForm(before),
      whatsapp: "0725 912",
      facebookUrl: "https://evil.example/facebook.com",
      channelLink: "http://whatsapp.com/channel/abc",
      unpaidHours: "0",
      retentionMonths: "5",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path.join(".")).sort()).toEqual([
        "channelLink",
        "facebookUrl",
        "retentionMonths",
        "unpaidHours",
        "whatsapp",
      ]);
    expect(settingsSchema.safeParse({ ...asForm(before), whatsapp: "+254 712-345-678" }).success).toBe(true);
  });
});

describe("describeSettingsChanges", () => {
  it("shows each change as old → new", () => {
    const after = { ...before, paybill: "522522", instagramUrl: "https://instagram.com/jaycvs" };
    expect(describeSettingsChanges(before, after)).toEqual([
      "Instagram: none → https://instagram.com/jaycvs",
      "Paybill: 4027127 → 522522",
    ]);
    expect(describeSettingsChanges(before, before)).toEqual([]);
  });
});
