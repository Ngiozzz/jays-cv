import "server-only";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { homepageStatsSchema } from "../content.schema";
import * as history from "./history";
import { describeHomepageChanges, homepageSchema, STAT_COUNT, type StoredHomepage } from "./homepage";
import * as repo from "./homepage.repo";
import { fieldErrorsOf, type SaveResult } from "./save-result";

// Admin → Website content → Homepage (owner only). A save records the old text, so it can be undone.

async function storedHomepage(tenantId: string): Promise<StoredHomepage> {
  const homepage = await repo.findHomepage(tenantId);
  const stats = homepageStatsSchema.parse(homepage.stats);
  // The form always has four number boxes
  const padded = Array.from({ length: STAT_COUNT }, (_, i) => stats[i] ?? { value: "", label: "" });
  return { ...homepage, stats: padded };
}

export async function loadHomepage(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  return storedHomepage(member.tenant.id);
}

export async function restoreHomepage(tx: history.Tx, before: unknown) {
  await repo.updateHomepage(tx, before as StoredHomepage);
}

export async function saveHomepage(member: CurrentMember, raw: unknown): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = homepageSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const tenantId = member.tenant.id;
  const before = await storedHomepage(tenantId);
  const changes = describeHomepageChanges(before, parsed.data);
  if (changes.length === 0) return { ok: true, message: "Nothing changed." };
  const summary = `Homepage: ${changes.join(", ")}`;
  await history.inTransaction(tenantId, async (tx) => {
    await repo.updateHomepage(tx, parsed.data);
    await history.recordChange(tx, tenantId, { section: "home", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}
