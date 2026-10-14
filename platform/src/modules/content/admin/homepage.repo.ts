import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { StoredHomepage } from "./homepage";
import type { Tx } from "./history";

const FIELDS = {
  headline: true,
  highlight: true,
  lead: true,
  stats: true,
  announcementOn: true,
  announcementText: true,
  announcementLink: true,
} as const;

export function findHomepage(tenantId: string) {
  return tenantDb(tenantId).homepage.findFirstOrThrow({ select: FIELDS });
}

export function updateHomepage(tx: Tx, homepage: StoredHomepage) {
  return tx.homepage.updateMany({ data: homepage });
}
