import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { Tx } from "./history";
import type { NewSample } from "./samples";

// Every sample in website order, unpublished ones too (the website only reads published ones)
export function findAllSamples(tenantId: string) {
  return tenantDb(tenantId).sample.findMany({ orderBy: [{ sortOrder: "asc" }, { role: "asc" }] });
}

export function updateSample(
  tx: Tx,
  id: string,
  data: Partial<{ role: string; tag: string; caption: string; published: boolean; sortOrder: number }>,
) {
  return tx.sample.update({ where: { id }, data });
}

// Numbers the samples 0, 1, 2… in the given order
export async function setOrder(tx: Tx, ids: string[]) {
  for (const [sortOrder, id] of ids.entries()) await tx.sample.update({ where: { id }, data: { sortOrder } });
}

export function createSample(
  tx: Tx,
  tenantId: string,
  sample: NewSample & { slug: string; beforeImage: string; afterImage: string; sortOrder: number },
) {
  // New samples wait unpublished until the owner has checked them
  return tx.sample.create({ data: { ...sample, published: false, tenantId } });
}

export function deleteSample(tx: Tx, id: string) {
  return tx.sample.delete({ where: { id } });
}
