import { describe, expect, it } from "vitest";
import { describeFaqChanges, faqErrorKey, faqListSchema, type StoredFaq } from "./faqs";

const before: StoredFaq[] = [
  { id: "a", question: "How long does it take?", answer: "24 to 72 hours.", visible: true },
  { id: "b", question: "How do I pay?", answer: "M-Pesa or bank.", visible: true },
  { id: "c", question: "Do you write cover letters?", answer: "Yes, from KES 800.", visible: true },
];

describe("faqListSchema", () => {
  it("tidies the text and refuses empty answers", () => {
    const [faq] = faqListSchema.parse([{ id: null, question: " Is it safe? ", answer: "Yes, always.", visible: true }]);
    expect(faq.question).toBe("Is it safe?");
    const result = faqListSchema.safeParse([{ id: "a", question: "How long?", answer: "", visible: true }]);
    expect(result.success).toBe(false);
    if (!result.success) expect(faqErrorKey(result.error.issues[0].path)).toBe("answer-0");
  });
});

describe("describeFaqChanges", () => {
  it("lists additions, deletions, edits, hiding and reordering", () => {
    const after = [
      { ...before[2], visible: false },
      { ...before[0], answer: "24 hours for most packages." },
      { id: null, question: "Can you help with LinkedIn?", answer: "Yes.", visible: true },
    ];
    expect(describeFaqChanges(before, after)).toEqual([
      'added "Can you help with LinkedIn?"',
      'edited "How long does it take?"',
      'deleted "How do I pay?"',
      'hid "Do you write cover letters?"',
      "changed the order",
    ]);
  });

  it("is empty when nothing changed", () => {
    expect(describeFaqChanges(before, before)).toEqual([]);
  });
});
