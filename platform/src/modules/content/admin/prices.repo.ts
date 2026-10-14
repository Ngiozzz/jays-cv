import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { Tx } from "./history";
import type { PackageTerms } from "./prices";

const bySortOrder = { sortOrder: "asc" } as const;

// Every package and service, hidden ones too (the website only reads the visible ones)
export function findAllPackages(tenantId: string) {
  return tenantDb(tenantId).package.findMany({ orderBy: bySortOrder });
}

export function findAllServices(tenantId: string) {
  return tenantDb(tenantId).service.findMany({ orderBy: bySortOrder });
}

export async function updatePackage(tx: Tx, id: string, terms: PackageTerms) {
  // Only one package can be "Most popular"
  if (terms.popular)
    await tx.package.updateMany({ where: { popular: true, id: { not: id } }, data: { popular: false } });
  return tx.package.update({ where: { id }, data: terms });
}

export function updateService(tx: Tx, id: string, data: { note: string; price: number; visible: boolean }) {
  return tx.service.update({ where: { id }, data });
}
