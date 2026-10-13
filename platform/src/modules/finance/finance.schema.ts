import { z } from "zod";

// Recording money the owner has already sent to a writer by M-Pesa
export const payoutSchema = z.object({
  amount: z.coerce
    .number({ error: "Enter the amount you sent" })
    .int("Use whole shillings")
    .min(1, "Enter the amount you sent")
    .max(10_000_000, "That amount looks too big"),
  reference: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase().replace(/\s/g, ""))
    .pipe(
      z
        .string()
        .regex(/^[A-Z0-9]{10}$/, "An M-Pesa code is 10 letters and numbers, e.g. SJT7Q2KX4M")
        .or(z.literal("")),
    ),
});

export type PayoutInput = z.infer<typeof payoutSchema>;

export function payoutFormToInput(form: FormData): unknown {
  return { amount: form.get("amount") ?? "", reference: form.get("reference") ?? "" };
}
