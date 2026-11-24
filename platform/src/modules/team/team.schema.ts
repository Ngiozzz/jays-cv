import { z } from "zod";
import { normalizeEmail } from "./invites";

// What a writer may do: set when inviting, changed later with "Edit". (Writers are on a monthly
// salary, paid outside the app, so there's no pay here.)
export const memberTermsSchema = z.object({
  canWrite: z.boolean(),
  canPostJobs: z.boolean(),
});

export const inviteSchema = memberTermsSchema
  .extend({
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
  })
  // A writer invited with nothing switched on could sign in but do nothing
  .refine((invite) => invite.canWrite || invite.canPostJobs, {
    path: ["canWrite"],
    message: "Tick at least one: Write CVs or Post jobs",
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
  };
}

export function termsFormToInput(form: FormData): unknown {
  return {
    canWrite: checked(form, "canWrite"),
    canPostJobs: checked(form, "canPostJobs"),
  };
}
