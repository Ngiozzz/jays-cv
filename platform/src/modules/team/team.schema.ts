import { z } from "zod";
import { normalizeEmail } from "./invites";

// What a writer may do and how they're paid: set when inviting, changed later with "Edit"
export const memberTermsSchema = z.object({
  canWrite: z.boolean(),
  canPostJobs: z.boolean(),
  payPercent: z.coerce
    .number()
    .int("Use a whole number")
    .min(0, "Pay can't be below 0%")
    .max(100, "Pay can't be above 100%"),
});

export const inviteSchema = memberTermsSchema.extend({
  name: z.string().trim().min(2, "Enter their name").max(80),
  // The Google account they'll sign in with: the invite only works for this address
  email: z
    .string()
    .trim()
    .pipe(z.email("Enter the Google email address they'll sign in with"))
    .transform(normalizeEmail),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?254|0)[17]\d{8}$/, "Enter a Kenyan WhatsApp number, e.g. 0712 345 678")
    .or(z.literal("")),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type MemberTerms = z.infer<typeof memberTermsSchema>;

const checked = (form: FormData, name: string) => form.get(name) === "on";
const compactPhone = (value: FormDataEntryValue | null) => String(value ?? "").replace(/[\s-]/g, "");

export function inviteFormToInput(form: FormData): unknown {
  return {
    name: form.get("name") ?? "",
    email: form.get("email") ?? "",
    phone: compactPhone(form.get("phone")),
    canWrite: checked(form, "canWrite"),
    canPostJobs: checked(form, "canPostJobs"),
    payPercent: form.get("payPercent") ?? 0,
  };
}

export function termsFormToInput(form: FormData): unknown {
  return {
    canWrite: checked(form, "canWrite"),
    canPostJobs: checked(form, "canPostJobs"),
    payPercent: form.get("payPercent") ?? 0,
  };
}
