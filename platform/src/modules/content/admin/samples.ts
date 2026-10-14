import { z } from "zod";

// Sample CVs tab: before/after CVs on the Samples page (the first 3 also on the homepage)

// The industries the Samples page can be filtered by
export const SAMPLE_TAGS = [
  "Finance",
  "Healthcare",
  "Tech & engineering",
  "NGO & development",
  "Graduates",
  "International",
] as const;

const role = z.string().trim().min(2, "Enter the job title").max(60, "Keep it under 60 characters");
const tag = z.enum(SAMPLE_TAGS, { error: "Pick an industry" });
const caption = z.string().trim().min(2, "Say what happened, e.g. Shortlisted in 2 weeks").max(80, "Keep it short");

export const sampleRowSchema = z.object({ id: z.string(), role, tag, caption, published: z.boolean() });
export type SampleRow = z.infer<typeof sampleRowSchema>;
// A sample as stored (its industry may be any text)
export type SampleFields = Omit<SampleRow, "tag"> & { tag: string };

export function samplesFormToInput(form: FormData, ids: string[]): unknown[] {
  return ids.map((id) => ({
    id,
    role: form.get(`role-${id}`) ?? "",
    tag: form.get(`tag-${id}`) ?? "",
    caption: form.get(`caption-${id}`) ?? "",
    published: form.get(`published-${id}`) === "on",
  }));
}

export function describeSampleChanges(before: SampleFields[], after: SampleFields[]): string[] {
  const changes: string[] = [];
  for (const old of before) {
    const now = after.find((row) => row.id === old.id);
    if (!now) continue;
    if (now.role !== old.role) changes.push(`"${old.role}" renamed "${now.role}"`);
    if (now.tag !== old.tag) changes.push(`${now.role} moved to ${now.tag}`);
    if (now.caption !== old.caption) changes.push(`${now.role} result updated`);
    if (now.published !== old.published) changes.push(`${now.role} ${now.published ? "published" : "unpublished"}`);
  }
  return changes;
}

// The order after moving one sample a place earlier or later (unchanged at either end)
export function moveInOrder(ids: string[], id: string, direction: "earlier" | "later"): string[] {
  const from = ids.indexOf(id);
  const to = direction === "earlier" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const order = [...ids];
  [order[from], order[to]] = [order[to], order[from]];
  return order;
}

// ---------- Adding a sample ----------

export const SAMPLE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type SampleImageType = (typeof SAMPLE_IMAGE_TYPES)[number];
// Images are shrunk in the browser before upload, so real files are far smaller
export const SAMPLE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export function sampleImageProblem(file: { type: string; size: number } | null | undefined): string | null {
  if (!file || file.size === 0) return "Choose the image";
  if (!SAMPLE_IMAGE_TYPES.includes(file.type as SampleImageType)) return "Use a JPG, PNG or WebP image";
  if (file.size > SAMPLE_IMAGE_MAX_BYTES) return "That image is too large (4 MB at most)";
  return null;
}

export const newSampleSchema = z.object({ role, tag, caption });
export type NewSample = z.infer<typeof newSampleSchema>;

export function newSampleFormToInput(form: FormData): unknown {
  return { role: form.get("role") ?? "", tag: form.get("tag") ?? "", caption: form.get("caption") ?? "" };
}

// A readable, unique address part, e.g. "accountant-3f9a1c"
export const sampleSlug = (role: string, randomPart: string) =>
  `${role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)}-${randomPart}`;

const EXTENSION: Record<SampleImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// tenant/random-name: a replaced image never keeps an old link alive
export const sampleImagePath = (tenantId: string, side: "before" | "after", type: string, randomPart: string) =>
  `${tenantId}/${side}-${randomPart}.${EXTENSION[type as SampleImageType] ?? "jpg"}`;
