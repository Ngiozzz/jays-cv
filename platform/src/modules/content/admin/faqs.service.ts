import "server-only";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { describeFaqChanges, faqErrorKey, faqListSchema, type StoredFaq } from "./faqs";
import * as repo from "./faqs.repo";
import * as history from "./history";
import type { SaveResult } from "./save-result";

// Admin → Website content → FAQs (owner only). A save records the whole list as it was,
// so "Recent changes" can undo it, deleted questions included.

export async function loadFaqs(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  return repo.findAllFaqs(member.tenant.id);
}

export async function restoreFaqs(tx: history.Tx, before: unknown, tenantId: string) {
  await repo.replaceFaqs(tx, tenantId, before as StoredFaq[]);
}

export async function saveFaqs(member: CurrentMember, rows: unknown): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = faqListSchema.safeParse(rows);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      parsed.error.issues.map((issue) => [faqErrorKey(issue.path), issue.message]),
    );
    return { ok: false, fieldErrors };
  }
  const tenantId = member.tenant.id;
  const before = await repo.findAllFaqs(tenantId);
  const known = new Set(before.map((faq) => faq.id));
  if (parsed.data.some((faq) => faq.id && !known.has(faq.id)))
    return { ok: false, fieldErrors: { form: "The FAQs changed meanwhile. Reload the page and try again." } };
  const changes = describeFaqChanges(before, parsed.data);
  if (changes.length === 0) return { ok: true, message: "Nothing changed." };
  const summary = `FAQs: ${changes.join(", ")}`;
  await history.inTransaction(tenantId, async (tx) => {
    await repo.replaceFaqs(tx, tenantId, parsed.data);
    await history.recordChange(tx, tenantId, { section: "faqs", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}
