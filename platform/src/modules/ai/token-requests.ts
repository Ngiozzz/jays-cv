// The owner asking the platform owner for more AI tokens: the amounts on offer and the form's rules
import { z } from "zod";

export const TOKEN_REQUEST_CHOICES = [500_000, 1_000_000, 2_000_000, 5_000_000] as const;
// "Other amount": anything in this range, typed in
export const MIN_TOKEN_REQUEST = 100_000;
export const MAX_TOKEN_REQUEST = 50_000_000;

export const tokenRequestSchema = z.object({
  tokens: z.coerce
    .number({ error: "Pick how many tokens you need" })
    .int("Type a whole number of tokens")
    .min(MIN_TOKEN_REQUEST, `Ask for at least ${MIN_TOKEN_REQUEST.toLocaleString("en-KE")} tokens`)
    .max(MAX_TOKEN_REQUEST, `Ask for at most ${MAX_TOKEN_REQUEST.toLocaleString("en-KE")} tokens`),
  note: z
    .string()
    .trim()
    .max(200, "Keep the note under 200 characters")
    .transform((note) => note || null),
});

export type TokenRequestInput = z.infer<typeof tokenRequestSchema>;

// The picked amount, or the typed one ("1,500,000" and "1 500 000" both work)
export function tokenRequestFormToInput(form: FormData): unknown {
  const picked = String(form.get("tokens") ?? "");
  const tokens = picked === "other" ? String(form.get("otherTokens") ?? "").replace(/[\s,]/g, "") : picked;
  return { tokens: tokens === "" ? undefined : tokens, note: form.get("note") ?? "" };
}
