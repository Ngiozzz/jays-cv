import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { tenantDb, type TenantDb } from "@/lib/tenant-db";

// "Recent changes": every save records what the section looked like before, so it can be undone

export const SECTIONS = {
  packages: "Packages & prices",
  services: "Single services",
  reviews: "Reviews",
  samples: "Sample CVs",
  posts: "Career tips",
  faqs: "FAQs",
  home: "Homepage",
  about: "About page",
  settings: "Business settings",
} as const;

export type Section = keyof typeof SECTIONS;

// A transaction client: the change and its history entry are saved together, or not at all
export type Tx = Parameters<Parameters<TenantDb["$transaction"]>[0]>[0];

// Runs a save and its history entry together. The database is far away, so a save that touches
// several rows (a whole FAQ list, an undo) gets longer than Prisma's 5-second default.
export function inTransaction<T>(tenantId: string, work: (tx: Tx) => Promise<T>) {
  return tenantDb(tenantId).$transaction(work, { maxWait: 10_000, timeout: 20_000 });
}

export function recordChange(
  tx: Tx,
  tenantId: string,
  change: { section: Section; summary: string; before: Prisma.InputJsonValue; changedById: string },
) {
  return tx.contentChange.create({ data: { ...change, tenantId } });
}

export function findRecentChanges(tenantId: string, take: number) {
  return tenantDb(tenantId).contentChange.findMany({
    orderBy: { at: "desc" },
    take,
    select: { id: true, section: true, summary: true, at: true, changedBy: { select: { displayName: true } } },
  });
}

export function findChange(tenantId: string, id: string) {
  return tenantDb(tenantId).contentChange.findFirst({ where: { id } });
}

// Only the newest change in a section can be undone, so undoing never wipes out a later edit
export async function isNewestInSection(tenantId: string, change: { id: string; section: string }) {
  const newest = await tenantDb(tenantId).contentChange.findFirst({
    where: { section: change.section },
    orderBy: { at: "desc" },
    select: { id: true },
  });
  return newest?.id === change.id;
}

export function deleteChange(tx: Tx, id: string) {
  return tx.contentChange.delete({ where: { id } });
}
