import { z } from "zod";

// Business settings tab: contact details and links used across the whole website, the order
// rules, how long client files are kept, the AI token warning and the M-Pesa Paybill.

export const RETENTION_CHOICES = [
  { months: 3, label: "3 months after delivery" },
  { months: 6, label: "6 months after delivery" },
  { months: 12, label: "12 months after delivery" },
  { months: 24, label: "24 months after delivery" },
  { months: 0, label: "Keep until I delete them" },
] as const;
export const POSTER_RETENTION_CHOICES = [1, 3, 6, 12] as const;
export const AI_WARN_CHOICES = [10, 20, 30, 50] as const;

// A Kenyan mobile number, written any common way: 0712 345 678, +254 712 345 678, 254712345678
const KENYAN_MOBILE = /^(?:\+?254|0)[17]\d{8}$/;

const whole = (min: number, max: number, unit: string) =>
  z.coerce
    .number({ error: `Enter a number of ${unit}` })
    .int(`Use a whole number of ${unit}`)
    .min(min, `Use ${min} to ${max} ${unit}`)
    .max(max, `Use ${min} to ${max} ${unit}`);

const oneOf = (choices: readonly number[], message: string) =>
  z.coerce.number().refine((value) => choices.includes(value), message);

// An optional https:// address; left empty, it isn't shown on the website
const webLink = (hosts: string[], example: string) =>
  z
    .string()
    .trim()
    .max(200, "Keep the link under 200 characters")
    .refine((value) => {
      if (value === "") return true;
      try {
        const url = new URL(value);
        const host = url.hostname.replace(/^www\./, "");
        return url.protocol === "https:" && hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
      } catch {
        return false;
      }
    }, `Paste the full link, e.g. ${example}`)
    .transform((value) => value || null);

export const settingsSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .refine(
      (value) => KENYAN_MOBILE.test(value.replace(/[\s-]/g, "")),
      "Enter a Kenyan mobile number, e.g. 0712 345 678",
    ),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  address: z.string().trim().min(5, "Enter the office address").max(120, "Keep the address under 120 characters"),
  channelLink: webLink(["whatsapp.com"], "https://whatsapp.com/channel/…"),
  linkedinUrl: webLink(["linkedin.com"], "https://linkedin.com/company/…"),
  facebookUrl: webLink(["facebook.com", "fb.com"], "https://facebook.com/…"),
  instagramUrl: webLink(["instagram.com"], "https://instagram.com/…"),
  xUrl: webLink(["x.com", "twitter.com"], "https://x.com/…"),
  unpaidHours: whole(1, 168, "hours"),
  reminderDays: whole(1, 14, "days"),
  autoCompleteDays: whole(1, 30, "days"),
  revisionHours: whole(1, 96, "hours"),
  deleteAbandonedDays: whole(7, 365, "days"),
  cvCheckPrice: whole(1, 1000, "shillings"),
  retentionMonths: oneOf(
    RETENTION_CHOICES.map((choice) => choice.months),
    "Pick how long to keep client files",
  ),
  posterRetentionMonths: oneOf(POSTER_RETENTION_CHOICES, "Pick how long to keep job posters"),
  aiWarnPct: oneOf(AI_WARN_CHOICES, "Pick when to warn you"),
  paybill: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{5,7}$/, "Enter your Paybill number (5 to 7 digits)")),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type StoredSettings = SettingsInput;

export const SETTINGS_FIELDS = Object.keys(settingsSchema.shape) as (keyof SettingsInput)[];

export function settingsFormToInput(form: FormData): unknown {
  return Object.fromEntries(SETTINGS_FIELDS.map((name) => [name, String(form.get(name) ?? "")]));
}

const LABELS: Record<keyof SettingsInput, string> = {
  whatsapp: "WhatsApp number",
  email: "email",
  address: "address",
  channelLink: "job channel link",
  linkedinUrl: "LinkedIn",
  facebookUrl: "Facebook",
  instagramUrl: "Instagram",
  xUrl: "X",
  unpaidHours: "abandon unpaid orders after (hours)",
  reminderDays: "draft reminder (days)",
  autoCompleteDays: "auto-complete (days)",
  revisionHours: "revision time (hours)",
  deleteAbandonedDays: "delete abandoned orders after (days)",
  cvCheckPrice: "CV check price (KES)",
  retentionMonths: "keep client files (months)",
  posterRetentionMonths: "keep job posters (months)",
  aiWarnPct: "AI token warning (%)",
  paybill: "Paybill",
};

// How a save reads in "Recent changes", e.g. "Paybill: 4027127 → 522522"
export function describeSettingsChanges(before: StoredSettings, after: SettingsInput): string[] {
  const shown = (value: string | number | null) => (value === null || value === "" ? "none" : String(value));
  return SETTINGS_FIELDS.filter((name) => before[name] !== after[name]).map(
    (name) => `${LABELS[name]}: ${shown(before[name])} → ${shown(after[name])}`,
  );
}
