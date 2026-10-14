import "server-only";
import { z } from "zod";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan, can } from "@/modules/team/permissions";
import * as history from "./history";
import { SECTIONS, type Section } from "./history";
import {
  describePackageChange,
  describeServiceChanges,
  packageSchema,
  serviceSchema,
  toPackageTerms,
  type PackageTerms,
} from "./prices";
import * as pricesRepo from "./prices.repo";
import { restoreFaqs } from "./faqs.service";
import { restoreHomepage } from "./homepage.service";
import { restoreSettings } from "./settings.service";
import { restorePost } from "./posts.service";
import { restoreReview } from "./reviews.service";
import { restoreSamples } from "./samples.service";
import { fieldErrorsOf, type SaveResult } from "./save-result";

// Admin → Website content. Saves go live at once: the action refreshes the public pages' cache.
// The owner edits everything; writers may only draft career tips.

// ---------- Recent changes ----------

export async function loadRecentChanges(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  const changes = await history.findRecentChanges(member.tenant.id, 12);
  const newestPerSection = new Set<string>();
  return changes.map((change) => {
    const undoable = !newestPerSection.has(change.section);
    newestPerSection.add(change.section);
    return {
      id: change.id,
      who: change.changedBy?.displayName ?? "Someone",
      summary: change.summary,
      section: SECTIONS[change.section as Section] ?? change.section,
      at: change.at.toISOString(),
      undoable,
    };
  });
}

export type RecentChange = Awaited<ReturnType<typeof loadRecentChanges>>[number];

// Puts a section back the way it was before a change
const RESTORE: Partial<Record<Section, (tx: history.Tx, before: unknown, tenantId: string) => Promise<unknown>>> = {
  packages: async (tx, before) => {
    for (const { id, ...terms } of before as (PackageTerms & { id: string })[])
      await tx.package.update({ where: { id }, data: terms });
  },
  services: async (tx, before) => {
    for (const { id, note, price, visible } of before as {
      id: string;
      note: string;
      price: number;
      visible: boolean;
    }[])
      await pricesRepo.updateService(tx, id, { note, price, visible });
  },
  reviews: restoreReview,
  samples: restoreSamples,
  posts: restorePost,
  faqs: restoreFaqs,
  home: restoreHomepage,
  settings: restoreSettings,
};

export async function undoChange(
  member: CurrentMember,
  changeId: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  assertCan(member, "editWebsiteContent");
  const tenantId = member.tenant.id;
  const change = await history.findChange(tenantId, changeId);
  if (!change) return { ok: false, error: "This change was already undone." };
  if (!(await history.isNewestInSection(tenantId, change)))
    return { ok: false, error: "Undo the newer change in this section first." };
  const restore = RESTORE[change.section as Section];
  if (!restore) return { ok: false, error: "This change can't be undone." };
  await history.inTransaction(tenantId, async (tx) => {
    await restore(tx, change.before, tenantId);
    await history.deleteChange(tx, change.id);
  });
  return { ok: true, message: `Undone: ${change.summary}` };
}

// ---------- Packages & prices ----------

const packageTermsOf = (pkg: PackageTerms & { id: string }) => ({
  id: pkg.id,
  name: pkg.name,
  price: pkg.price,
  bestFor: pkg.bestFor,
  firstDraftHours: pkg.firstDraftHours,
  revisionRounds: pkg.revisionRounds,
  revisionWindowDays: pkg.revisionWindowDays,
  features: pkg.features,
  popular: pkg.popular,
  visible: pkg.visible,
});

export async function loadPrices(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  const [packages, services] = await Promise.all([
    pricesRepo.findAllPackages(member.tenant.id),
    pricesRepo.findAllServices(member.tenant.id),
  ]);
  return {
    packages: packages.map((pkg) => ({ ...packageTermsOf(pkg), shortName: pkg.shortName })),
    services: services.map((s) => ({ id: s.id, name: s.name, note: s.note, price: s.price, visible: s.visible })),
  };
}

export type PricesData = Awaited<ReturnType<typeof loadPrices>>;
export type AdminPackage = PricesData["packages"][number];
export type AdminService = PricesData["services"][number];

export async function savePackage(member: CurrentMember, packageId: string, raw: unknown): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const tenantId = member.tenant.id;
  const before = (await pricesRepo.findAllPackages(tenantId)).map(packageTermsOf);
  const current = before.find((pkg) => pkg.id === packageId);
  if (!current) return { ok: false, fieldErrors: { form: "This package no longer exists." } };
  const next = toPackageTerms(parsed.data, current);
  const changes = describePackageChange(current, next);
  if (changes.length === 0) return { ok: true, message: "Nothing changed." };
  const summary = `${current.name}: ${changes.join(", ")}`;
  await history.inTransaction(tenantId, async (tx) => {
    await pricesRepo.updatePackage(tx, packageId, next);
    await history.recordChange(tx, tenantId, { section: "packages", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}

export async function saveServices(member: CurrentMember, rows: unknown[]): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = z.array(serviceSchema).safeParse(rows);
  if (!parsed.success) {
    // Row errors go next to their own input, e.g. "price-<service id>"
    const idAt = (index: unknown) => (rows[Number(index)] as { id?: string } | undefined)?.id ?? "";
    const fieldErrors = Object.fromEntries(
      parsed.error.issues.map((issue) => [`${String(issue.path[1])}-${idAt(issue.path[0])}`, issue.message]),
    );
    return { ok: false, fieldErrors };
  }
  const tenantId = member.tenant.id;
  const before = await pricesRepo.findAllServices(tenantId);
  const byId = new Map(parsed.data.map((row) => [row.id, row]));
  if (before.some((service) => !byId.has(service.id)))
    return { ok: false, fieldErrors: { form: "The services changed meanwhile. Reload the page and try again." } };
  const after = before.map((service) => ({ ...service, ...byId.get(service.id)! }));
  const changes = describeServiceChanges(before, after);
  if (changes.length === 0) return { ok: true, message: "Nothing changed." };
  const summary = `Single services: ${changes.join(", ")}`;
  await history.inTransaction(tenantId, async (tx) => {
    for (const service of after) {
      await pricesRepo.updateService(tx, service.id, {
        note: service.note,
        price: service.price,
        visible: service.visible,
      });
    }
    await history.recordChange(tx, tenantId, {
      section: "services",
      summary,
      before: before.map(({ id, note, price, visible }) => ({ id, note, price, visible })),
      changedById: member.id,
    });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}

// Which tabs a member may open: the owner all of them, writers only Career tips
export function canEditSection(member: CurrentMember, section: Section) {
  return section === "posts" ? can(member, "draftCareerTips") : can(member, "editWebsiteContent");
}
