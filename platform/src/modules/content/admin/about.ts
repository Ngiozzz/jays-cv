import { z } from "zod";
import { webLink } from "./settings";

// About page tab: the line under "About Jay CVS", the owner's story and photo, the numbers strip and
// the team (the writers the owner wants to give credit to, each with an optional photo and LinkedIn),
// and the owner's own links.
// Until the owner writes their own, the page shows clearly marked [placeholders], never made-up facts.

export const ABOUT_STAT_COUNT = 4;

const statSchema = z.object({
  value: z.string().trim().min(1, "Enter the number").max(12, "Keep it under 12 characters"),
  label: z.string().trim().min(2, "Enter what it counts").max(30, "Keep it under 30 characters"),
});

export const MAX_TEAM = 12;

const linkedin = webLink(["linkedin.com"], "https://linkedin.com/in/…");

// The owner's own pages; empty ones aren't shown
export const OWNER_LINKS = [
  { name: "linkedin", label: "LinkedIn", schema: linkedin },
  { name: "facebook", label: "Facebook", schema: webLink(["facebook.com", "fb.com"], "https://facebook.com/…") },
  { name: "instagram", label: "Instagram", schema: webLink(["instagram.com"], "https://instagram.com/…") },
  { name: "x", label: "X (Twitter)", schema: webLink(["x.com", "twitter.com"], "https://x.com/…") },
] as const;

export type OwnerLinkName = (typeof OWNER_LINKS)[number]["name"];

const ownerLinksSchema = z.object({
  linkedin: OWNER_LINKS[0].schema,
  facebook: OWNER_LINKS[1].schema,
  instagram: OWNER_LINKS[2].schema,
  x: OWNER_LINKS[3].schema,
});

const teamMemberSchema = z.object({
  // Made by the form when a person is added; links each person to their photo
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(2, "Enter their name").max(60, "Keep it under 60 characters"),
  role: z.string().trim().min(2, "Enter their role, e.g. CV writer").max(60, "Keep it under 60 characters"),
  note: z.string().trim().max(160, "Keep it under 160 characters"),
  linkedin,
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
  ownerLinks: ownerLinksSchema,
  team: z
    .array(teamMemberSchema)
    .max(MAX_TEAM, `Keep it to ${MAX_TEAM} people or fewer`)
    .refine((team) => new Set(team.map((person) => person.id)).size === team.length, "Each person must be listed once"),
});

export type AboutInput = z.infer<typeof aboutSchema>;
export type StoredTeamMember = AboutInput["team"][number] & { photo: string | null };
export type StoredAbout = Omit<AboutInput, "team"> & { photo: string | null; team: StoredTeamMember[] };

// The team is stored as JSON; this is its shape
export const storedTeamSchema = z.array(
  teamMemberSchema.extend({ linkedin: z.string().nullable().default(null), photo: z.string().nullable() }),
);

export const NO_OWNER_LINKS: StoredAbout["ownerLinks"] = { linkedin: null, facebook: null, instagram: null, x: null };
export const storedOwnerLinksSchema = z
  .object({
    linkedin: z.string().nullable().default(null),
    facebook: z.string().nullable().default(null),
    instagram: z.string().nullable().default(null),
    x: z.string().nullable().default(null),
  })
  .catch(NO_OWNER_LINKS);

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
  ownerLinks: NO_OWNER_LINKS,
  // Empty until the owner adds someone; the team section is hidden until then
  team: [],
};

// Placeholder text still waiting for the owner, e.g. "[Your full name]"
export const hasPlaceholders = (about: AboutInput) =>
  [
    about.lead,
    about.ownerName,
    about.ownerRole,
    about.story,
    ...about.stats.flatMap((s) => [s.value, s.label]),
    ...about.team.flatMap((person) => [person.name, person.role, person.note]),
  ].some((text) => /\[[^\]]+\]/.test(text));

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
    ownerLinks: Object.fromEntries(OWNER_LINKS.map((link) => [link.name, text(`owner-${link.name}`)])),
    // In the order they're listed on the form
    team: form.getAll("team-id").map((value) => {
      const id = String(value);
      return {
        id,
        name: text(`team-name-${id}`),
        role: text(`team-role-${id}`),
        note: text(`team-note-${id}`),
        linkedin: text(`team-linkedin-${id}`),
      };
    }),
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

const photoExtension = (type: string) => (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg");

export const aboutPhotoPath = (tenantId: string, type: string, random: string) =>
  `${tenantId}/owner-${random}.${photoExtension(type)}`;

export const teamPhotoPath = (tenantId: string, type: string, random: string) =>
  `${tenantId}/team-${random}.${photoExtension(type)}`;

// How a save reads in "Recent changes"
export function describeAboutChanges(before: StoredAbout, after: StoredAbout): string[] {
  const changes: string[] = [];
  if (before.lead !== after.lead) changes.push("changed the intro");
  if (before.ownerName !== after.ownerName || before.ownerRole !== after.ownerRole)
    changes.push("changed your name or role");
  if (before.photo !== after.photo) changes.push(after.photo ? "changed the photo" : "removed the photo");
  if (JSON.stringify(before.ownerLinks) !== JSON.stringify(after.ownerLinks)) changes.push("changed your links");
  if (before.story !== after.story) changes.push("changed your story");
  if (JSON.stringify(before.stats) !== JSON.stringify(after.stats)) changes.push("changed the numbers");
  changes.push(...describeTeamChanges(before.team, after.team));
  return changes;
}

function describeTeamChanges(before: StoredTeamMember[], after: StoredTeamMember[]): string[] {
  const changes: string[] = [];
  const old = new Map(before.map((person) => [person.id, person]));
  const kept = new Set(after.map((person) => person.id));
  const added = after.filter((person) => !old.has(person.id));
  const removed = before.filter((person) => !kept.has(person.id));
  if (added.length) changes.push(`added ${added.map((person) => person.name).join(", ")} to the team`);
  if (removed.length) changes.push(`removed ${removed.map((person) => person.name).join(", ")} from the team`);
  const edited = after.filter((person) => {
    const was = old.get(person.id);
    return was && JSON.stringify(was) !== JSON.stringify(person);
  });
  if (edited.length) changes.push(`changed ${edited.map((person) => person.name).join(", ")} on the team`);
  const oldOrder = before.map((person) => person.id).filter((id) => kept.has(id));
  const newOrder = after.map((person) => person.id).filter((id) => old.has(id));
  if (oldOrder.join() !== newOrder.join()) changes.push("changed the team order");
  return changes;
}
