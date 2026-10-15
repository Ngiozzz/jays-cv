import { z } from "zod";

// About page tab: the line under "About Jay CVS", the owner's story and photo, and the numbers strip.
// Until the owner writes their own, the page shows clearly marked [placeholders], never made-up facts.

export const ABOUT_STAT_COUNT = 4;

const statSchema = z.object({
  value: z.string().trim().min(1, "Enter the number").max(12, "Keep it under 12 characters"),
  label: z.string().trim().min(2, "Enter what it counts").max(30, "Keep it under 30 characters"),
});

export const aboutSchema = z.object({
  lead: z.string().trim().min(20, "Write a sentence or two").max(300, "Keep it under 300 characters"),
  ownerName: z.string().trim().min(2, "Enter your name").max(60, "Keep it under 60 characters"),
  ownerRole: z.string().trim().min(2, "Enter your role, e.g. Founder").max(60, "Keep it under 60 characters"),
  story: z
    .string()
    .trim()
    .min(50, "Tell your story in a few sentences")
    .max(3000, "Keep your story under 3,000 characters"),
  stats: z.array(statSchema).length(ABOUT_STAT_COUNT),
});

export type AboutInput = z.infer<typeof aboutSchema>;
export type StoredAbout = AboutInput & { photo: string | null };

// What a new business starts with. The [brackets] mark what the owner still has to fill in.
export const DEFAULT_ABOUT: StoredAbout = {
  lead: "We turn your CV into interviews. Since 2018 we've helped job seekers across Kenya show their experience with confidence and land the jobs they deserve.",
  ownerName: "[Your full name]",
  ownerRole: "Founder, Jay CVS",
  photo: null,
  story:
    "[Your story goes here: who you are, your background, and why you started Jay CVS in 2018.]\n\n[What you believe makes a CV get shortlisted, and how you and your team work with every client.]",
  stats: [
    { value: "2018", label: "In business since" },
    { value: "57,000+", label: "Follow our job channel" },
    { value: "[Number]", label: "CVs written" },
    { value: "[Number]", label: "Writers on the team" },
  ],
};

// Placeholder text still waiting for the owner, e.g. "[Your full name]"
export const hasPlaceholders = (about: AboutInput) =>
  [about.lead, about.ownerName, about.ownerRole, about.story, ...about.stats.flatMap((s) => [s.value, s.label])].some(
    (text) => /\[[^\]]+\]/.test(text),
  );

export function aboutFormToInput(form: FormData): unknown {
  const text = (name: string) => String(form.get(name) ?? "");
  return {
    lead: text("lead"),
    ownerName: text("ownerName"),
    ownerRole: text("ownerRole"),
    story: text("story").replace(/\r\n/g, "\n"),
    stats: Array.from({ length: ABOUT_STAT_COUNT }, (_, i) => ({
      value: text(`stat-value-${i}`),
      label: text(`stat-label-${i}`),
    })),
  };
}

// Shown instead of a photo: "Jay Mwangi" → "JM"; the business's initials while the name is a [placeholder]
export function ownerInitials(name: string, businessName: string): string {
  const letters = (text: string) =>
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("");
  return (/\[/.test(name) ? "" : letters(name)) || letters(businessName);
}

// ---------- The owner's photo ----------

export const ABOUT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// Photos are shrunk in the browser before upload, so real files are far smaller
export const ABOUT_PHOTO_MAX_BYTES = 4 * 1024 * 1024;

export function aboutPhotoProblem(file: { type: string; size: number }): string | null {
  if (!(ABOUT_PHOTO_TYPES as readonly string[]).includes(file.type)) return "Use a JPG, PNG or WebP photo";
  if (file.size > ABOUT_PHOTO_MAX_BYTES) return "That photo is too large (4 MB at most)";
  return null;
}

export const aboutPhotoPath = (tenantId: string, type: string, random: string) =>
  `${tenantId}/owner-${random}.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`;

// How a save reads in "Recent changes"
export function describeAboutChanges(before: StoredAbout, after: StoredAbout): string[] {
  const changes: string[] = [];
  if (before.lead !== after.lead) changes.push("changed the intro");
  if (before.ownerName !== after.ownerName || before.ownerRole !== after.ownerRole)
    changes.push("changed your name or role");
  if (before.photo !== after.photo) changes.push(after.photo ? "changed the photo" : "removed the photo");
  if (before.story !== after.story) changes.push("changed your story");
  if (JSON.stringify(before.stats) !== JSON.stringify(after.stats)) changes.push("changed the numbers");
  return changes;
}
