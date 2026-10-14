import { z } from "zod";
import { formatNumber } from "@/lib/money";
import { revisionsLabel } from "../packages";

// Packages & prices tab: what the owner can change, and how a change reads in "Recent changes"

export const DRAFT_HOURS = [12, 24, 48, 72] as const;
export const REVISION_CHOICES = ["1", "2", "3", "unlimited"] as const;
// "Unlimited" revisions are unlimited within this many days (unless the package already has its own window)
export const UNLIMITED_WINDOW_DAYS = 14;

const price = z.coerce
  .number({ error: "Enter a price" })
  .int("Use whole shillings")
  .min(1, "Enter a price")
  .max(1_000_000, "That price looks too big");

export const packageSchema = z.object({
  name: z.string().trim().min(2, "Enter the package name").max(60),
  price,
  bestFor: z.string().trim().min(2, "Say who it's best for").max(80),
  firstDraftHours: z.coerce
    .number()
    .refine((hours) => (DRAFT_HOURS as readonly number[]).includes(hours), "Pick a delivery time"),
  revisions: z.enum(REVISION_CHOICES, { error: "Pick the revision rounds" }),
  features: z
    .array(z.string().trim().max(80, "Keep each line under 80 characters"))
    .transform((lines) => lines.filter(Boolean))
    .pipe(z.array(z.string()).min(1, "Add at least one line").max(10, "Keep it to 10 lines or fewer")),
  popular: z.boolean(),
  visible: z.boolean(),
});

export type PackageInput = z.infer<typeof packageSchema>;

export function packageFormToInput(form: FormData): unknown {
  return {
    name: form.get("name") ?? "",
    price: String(form.get("price") ?? "").replace(/[\s,]/g, ""),
    bestFor: form.get("bestFor") ?? "",
    firstDraftHours: form.get("firstDraftHours") ?? "",
    revisions: form.get("revisions") ?? "",
    features: String(form.get("features") ?? "").split("\n"),
    popular: form.get("popular") === "on",
    visible: form.get("visible") === "on",
  };
}

export type PackageTerms = {
  name: string;
  price: number;
  bestFor: string;
  firstDraftHours: number;
  revisionRounds: number | null;
  revisionWindowDays: number | null;
  features: string[];
  popular: boolean;
  visible: boolean;
};

export function revisionChoice(pkg: Pick<PackageTerms, "revisionRounds">): (typeof REVISION_CHOICES)[number] {
  if (pkg.revisionRounds === null) return "unlimited";
  return String(Math.min(3, Math.max(1, pkg.revisionRounds))) as "1" | "2" | "3";
}

// The edited package as it will be stored; "unlimited" keeps the package's own window if it has one
export function toPackageTerms(input: PackageInput, current: Pick<PackageTerms, "revisionWindowDays">): PackageTerms {
  const unlimited = input.revisions === "unlimited";
  return {
    name: input.name,
    price: input.price,
    bestFor: input.bestFor,
    firstDraftHours: input.firstDraftHours,
    revisionRounds: unlimited ? null : Number(input.revisions),
    revisionWindowDays: unlimited ? (current.revisionWindowDays ?? UNLIMITED_WINDOW_DAYS) : null,
    features: input.features,
    popular: input.popular,
    visible: input.visible,
  };
}

// "Professional: price 3,000 → 3,500, now "Most popular"" — empty when nothing changed
export function describePackageChange(before: PackageTerms, after: PackageTerms): string[] {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`name → "${after.name}"`);
  if (before.price !== after.price) changes.push(`price ${formatNumber(before.price)} → ${formatNumber(after.price)}`);
  if (before.firstDraftHours !== after.firstDraftHours)
    changes.push(`first draft ${before.firstDraftHours}h → ${after.firstDraftHours}h`);
  if (before.revisionRounds !== after.revisionRounds || before.revisionWindowDays !== after.revisionWindowDays)
    changes.push(`revisions ${revisionsLabel(before)} → ${revisionsLabel(after)}`);
  if (before.popular !== after.popular) changes.push(after.popular ? 'now "Most popular"' : 'no longer "Most popular"');
  if (before.visible !== after.visible) changes.push(after.visible ? "shown" : "hidden");
  if (before.bestFor !== after.bestFor || before.features.join("\n") !== after.features.join("\n"))
    changes.push("description updated");
  return changes;
}

export const serviceSchema = z.object({
  id: z.string().min(1),
  note: z.string().trim().max(80, "Keep the description under 80 characters"),
  price,
  visible: z.boolean(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

// The services form posts one row per service: price-<id>, note-<id>, visible-<id>
export function servicesFormToInput(form: FormData, ids: string[]): unknown[] {
  return ids.map((id) => ({
    id,
    note: form.get(`note-${id}`) ?? "",
    price: String(form.get(`price-${id}`) ?? "").replace(/[\s,]/g, ""),
    visible: form.get(`visible-${id}`) === "on",
  }));
}

type ServiceTerms = { name: string; note: string; price: number; visible: boolean };

export function describeServiceChanges(before: ServiceTerms[], after: ServiceTerms[]): string[] {
  return after.flatMap((next, i) => {
    const old = before[i];
    const changes: string[] = [];
    if (old.price !== next.price) changes.push(`${next.name} ${formatNumber(old.price)} → ${formatNumber(next.price)}`);
    if (old.visible !== next.visible) changes.push(`${next.name} ${next.visible ? "shown" : "hidden"}`);
    if (old.note !== next.note) changes.push(`${next.name} description`);
    return changes;
  });
}
