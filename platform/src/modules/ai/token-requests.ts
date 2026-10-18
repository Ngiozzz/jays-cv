// The owner asking the platform owner for more AI tokens: the amounts on offer and the form's rules
import { z } from "zod";

export const TOKEN_REQUEST_CHOICES = [500_000, 1_000_000, 2_000_000, 5_000_000] as const;

export const tokenRequestSchema = z.object({
  tokens: z.coerce
    .number({ error: "Pick how many tokens you need" })
    .refine((tokens) => (TOKEN_REQUEST_CHOICES as readonly number[]).includes(tokens), "Pick how many tokens you need"),
  note: z
    .string()
    .trim()
    .max(200, "Keep the note under 200 characters")
    .transform((note) => note || null),
});

export type TokenRequestInput = z.infer<typeof tokenRequestSchema>;

export function tokenRequestFormToInput(form: FormData): unknown {
  return { tokens: form.get("tokens") ?? "", note: form.get("note") ?? "" };
}
