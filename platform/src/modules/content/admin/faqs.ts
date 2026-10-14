import { z } from "zod";

// FAQs tab: the questions on the homepage. The whole list is edited together (wording, shown or
// not, order, added and deleted) and saved in one go.

export const MAX_FAQS = 20;

export const faqSchema = z.object({
  // null for a question added in this edit
  id: z.string().nullable(),
  question: z.string().trim().min(5, "Write the question").max(150, "Keep the question under 150 characters"),
  answer: z.string().trim().min(5, "Write the answer").max(1000, "Keep the answer under 1,000 characters"),
  visible: z.boolean(),
});

export const faqListSchema = z.array(faqSchema).max(MAX_FAQS, `Keep it to ${MAX_FAQS} questions or fewer`);

export type FaqInput = z.infer<typeof faqSchema>;
export type StoredFaq = { id: string; question: string; answer: string; visible: boolean };

// Field errors by row number, e.g. "question-2", so each shows under its own box
export function faqErrorKey(path: PropertyKey[]) {
  return path.length >= 2 ? `${String(path[1])}-${String(path[0])}` : "form";
}

const short = (question: string) => (question.length > 40 ? `${question.slice(0, 40).trimEnd()}…` : question);

// How a save reads in "Recent changes"
export function describeFaqChanges(before: StoredFaq[], after: FaqInput[]): string[] {
  const changes: string[] = [];
  const kept = new Map(after.filter((faq) => faq.id).map((faq) => [faq.id!, faq]));
  const added = after.filter((faq) => !faq.id);
  if (added.length) changes.push(added.map((faq) => `added "${short(faq.question)}"`).join(", "));
  for (const old of before) {
    const now = kept.get(old.id);
    if (!now) changes.push(`deleted "${short(old.question)}"`);
    else if (now.question !== old.question || now.answer !== old.answer)
      changes.push(`edited "${short(now.question)}"`);
    if (now && now.visible !== old.visible) changes.push(`${now.visible ? "showed" : "hid"} "${short(now.question)}"`);
  }
  const oldOrder = before.map((faq) => faq.id).filter((id) => kept.has(id));
  const newOrder = after.flatMap((faq) => (faq.id ? [faq.id] : []));
  if (oldOrder.join() !== newOrder.join()) changes.push("changed the order");
  return changes;
}
