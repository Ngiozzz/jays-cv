import "server-only";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import * as history from "./history";
import { fieldErrorsOf, type SaveResult } from "./save-result";
import { describeSettingsChanges, settingsSchema, type StoredSettings } from "./settings";
import * as repo from "./settings.repo";

// Admin → Website content → Business settings (owner only). The M-Pesa mode is shown but not
// changed here: going live waits for Safaricom's approval.

export async function loadSettings(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  return repo.findSettings(member.tenant.id);
}

export type AdminSettings = Awaited<ReturnType<typeof loadSettings>>;

export async function restoreSettings(tx: history.Tx, before: unknown) {
  await repo.updateSettings(tx, before as StoredSettings);
}

export async function saveSettings(member: CurrentMember, raw: unknown): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const tenantId = member.tenant.id;
  const before = await repo.findStoredSettings(tenantId);
  const changes = describeSettingsChanges(before, parsed.data);
  if (changes.length === 0) return { ok: true, message: "Nothing changed." };
  const summary = `Settings: ${changes.join("; ")}`;
  await history.inTransaction(tenantId, async (tx) => {
    await repo.updateSettings(tx, parsed.data);
    await history.recordChange(tx, tenantId, { section: "settings", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}
