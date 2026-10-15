import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { StoredAbout } from "./about";
import type { Tx } from "./history";

const FIELDS = { lead: true, ownerName: true, ownerRole: true, photo: true, story: true, stats: true } as const;

// null until the owner first saves the About page (the page shows the starting text until then)
export function findAbout(tenantId: string) {
  return tenantDb(tenantId).aboutPage.findFirst({ select: FIELDS });
}

export function saveAbout(tx: Tx, tenantId: string, about: StoredAbout) {
  return tx.aboutPage.upsert({ where: { tenantId }, create: { ...about, tenantId }, update: about });
}
