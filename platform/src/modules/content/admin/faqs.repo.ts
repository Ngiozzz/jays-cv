import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { Tx } from "./history";
import type { StoredFaq } from "./faqs";

// Every FAQ in homepage order, hidden ones too (the website only reads the visible ones)
export function findAllFaqs(tenantId: string) {
  return tenantDb(tenantId).faq.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, question: true, answer: true, visible: true },
  });
}

// Makes the stored list exactly this one, in this order (rows without an id are new)
export async function replaceFaqs(tx: Tx, tenantId: string, faqs: (Omit<StoredFaq, "id"> & { id: string | null })[]) {
  const keep = faqs.flatMap((faq) => (faq.id ? [faq.id] : []));
  await tx.faq.deleteMany({ where: { id: { notIn: keep } } });
  const existing = new Set((await tx.faq.findMany({ select: { id: true } })).map((faq) => faq.id));
  for (const [sortOrder, { id, ...faq }] of faqs.entries()) {
    if (id && existing.has(id)) await tx.faq.update({ where: { id }, data: { ...faq, sortOrder } });
    else await tx.faq.create({ data: { ...faq, sortOrder, tenantId, ...(id ? { id } : {}) } });
  }
}
