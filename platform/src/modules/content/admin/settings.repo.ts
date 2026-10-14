import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { Tx } from "./history";
import { SETTINGS_FIELDS, type StoredSettings } from "./settings";

const FIELDS = Object.fromEntries(SETTINGS_FIELDS.map((name) => [name, true])) as Record<keyof StoredSettings, true>;

// What the form shows: the editable settings and the M-Pesa mode
export function findSettings(tenantId: string) {
  return tenantDb(tenantId).businessSettings.findFirstOrThrow({ select: { ...FIELDS, mpesaMode: true } });
}

// What a save changes (and "Recent changes" keeps)
export function findStoredSettings(tenantId: string): Promise<StoredSettings> {
  return tenantDb(tenantId).businessSettings.findFirstOrThrow({ select: FIELDS });
}

export function updateSettings(tx: Tx, settings: StoredSettings) {
  return tx.businessSettings.updateMany({ data: settings });
}
