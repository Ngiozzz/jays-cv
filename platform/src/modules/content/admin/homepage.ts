import { z } from "zod";

// Homepage tab: the words at the top of the homepage, the numbers strip under them, and the
// announcement bar shown at the top of every page.

export const STAT_COUNT = 4;

const statSchema = z.object({
  value: z.string().trim().min(1, "Enter the number").max(12, "Keep it under 12 characters"),
  label: z.string().trim().min(2, "Enter what it counts").max(30, "Keep it under 30 characters"),
});

// A page on this website ("/pricing") or a full https:// address
const link = z
  .string()
  .trim()
  .max(200, "Keep the link under 200 characters")
  .refine(
    (value) => value === "" || /^\/(?!\/)\S*$/.test(value) || /^https:\/\/[^\s/]+\.\S+$/.test(value),
    "Use a page on this website, like /pricing, or a full address starting with https://",
  );

export const homepageSchema = z
  .object({
    headline: z.string().trim().min(3, "Write the headline").max(60, "Keep the headline under 60 characters"),
    highlight: z.string().trim().min(1, "Write the highlighted words").max(40, "Keep it under 40 characters"),
    lead: z.string().trim().min(20, "Write a sentence or two").max(300, "Keep the intro under 300 characters"),
    stats: z.array(statSchema).length(STAT_COUNT),
    announcementOn: z.boolean(),
    announcementText: z.string().trim().max(120, "Keep the message under 120 characters"),
    announcementLink: link,
  })
  .refine((home) => !home.announcementOn || home.announcementText, {
    path: ["announcementText"],
    message: "Write the message, or untick Show the announcement",
  });

export type HomepageInput = z.infer<typeof homepageSchema>;
export type StoredHomepage = Omit<HomepageInput, "stats"> & { stats: { value: string; label: string }[] };

export function homepageFormToInput(form: FormData): unknown {
  const text = (name: string) => String(form.get(name) ?? "");
  return {
    headline: text("headline"),
    highlight: text("highlight"),
    lead: text("lead"),
    stats: Array.from({ length: STAT_COUNT }, (_, i) => ({
      value: text(`stat-value-${i}`),
      label: text(`stat-label-${i}`),
    })),
    announcementOn: form.get("announcementOn") === "on",
    announcementText: text("announcementText"),
    announcementLink: text("announcementLink"),
  };
}

// How a save reads in "Recent changes"
export function describeHomepageChanges(before: StoredHomepage, after: HomepageInput): string[] {
  const changes: string[] = [];
  if (before.headline !== after.headline || before.highlight !== after.highlight) changes.push("changed the headline");
  if (before.lead !== after.lead) changes.push("changed the intro text");
  if (JSON.stringify(before.stats) !== JSON.stringify(after.stats)) changes.push("changed the numbers strip");
  if (before.announcementOn !== after.announcementOn)
    changes.push(after.announcementOn ? "turned on the announcement bar" : "turned off the announcement bar");
  if (before.announcementText !== after.announcementText || before.announcementLink !== after.announcementLink)
    changes.push("changed the announcement");
  return changes;
}
