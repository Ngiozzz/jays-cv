import { z } from "zod";

// The website's order card: what a client fills in to place an order. Pure rules, shared by the
// card (to guide the client) and the server (which checks everything again).

// Step 1, "What do you need?": each choice suggests a package (by its place in the price list)
export const NEEDS = [
  { key: "cv", title: "A professional CV", note: "A new CV, or a rewrite of your current one", packageIndex: 0 },
  { key: "cv-letter", title: "CV + cover letter", note: "Everything you need to start applying", packageIndex: 1 },
  {
    key: "makeover",
    title: "Full career makeover",
    note: "CV, cover letter, LinkedIn & a coaching call",
    packageIndex: 2,
  },
  {
    key: "single",
    title: "Just one service",
    note: "Cover letter, LinkedIn, coaching, interview prep…",
    packageIndex: null,
  },
] as const;
export type NeedKey = (typeof NEEDS)[number]["key"];

// "package:<id>" or "service:<id>": what is being bought
export function parseItem(value: string): { type: "package" | "service"; id: string } | null {
  const match = /^(package|service):([A-Za-z0-9_-]{1,40})$/.exec(value);
  return match ? { type: match[1] as "package" | "service", id: match[2] } : null;
}

// Kenyan mobile numbers however they're typed, stored one way: "0712 345 678"
export function kenyanMobile(input: string): string | null {
  const match = /^(?:\+?254|0)([17]\d{8})$/.exec(input.replace(/[\s-]/g, ""));
  if (!match) return null;
  const local = `0${match[1]}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

const optionalText = (max: number, message: string) => z.string().trim().max(max, message).default("");

export const orderDetailsSchema = z.object({
  item: z.string().refine((value) => parseItem(value) !== null, "Choose a package or service"),
  need: z.enum(NEEDS.map((need) => need.key) as [NeedKey, ...NeedKey[]]).optional(),
  name: z.string().trim().min(3, "Please enter your full name").max(80, "Keep your name under 80 characters"),
  phone: z.string().transform((value, ctx) => {
    const phone = kenyanMobile(value);
    if (!phone)
      ctx.addIssue({ code: "custom", message: "Please enter a valid Kenyan WhatsApp number, e.g. 0712 345 678" });
    return phone ?? "";
  }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .default("")
    .refine((value) => value === "" || z.email().safeParse(value).success, "Check your email address"),
  targetRole: optionalText(100, "Keep the job title under 100 characters"),
  notes: optionalText(1000, "Keep your note under 1,000 characters"),
  // A CV tailored to a job: the job page it was ordered from, or the advert pasted in
  jobSlug: optionalText(200, "Choose the job again from the jobs board"),
  jobAdvert: optionalText(5000, "Keep the job advert under 5,000 characters (or paste a link to it)"),
  noCv: z.boolean(),
  whatsappUpdates: z.boolean(),
});

export type OrderDetails = z.infer<typeof orderDetailsSchema>;

export function orderFormToInput(form: FormData): unknown {
  const text = (name: string) => String(form.get(name) ?? "");
  return {
    item: text("item"),
    need: text("need") || undefined,
    name: text("name"),
    phone: text("phone"),
    email: text("email"),
    targetRole: text("targetRole"),
    notes: text("notes"),
    jobSlug: text("jobSlug"),
    jobAdvert: text("jobAdvert"),
    noCv: form.get("noCv") === "on",
    whatsappUpdates: form.get("whatsappUpdates") === "on",
  };
}

// The client's CV: a document or a clear photo of it
export const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_CV_BYTES = 10 * 1024 * 1024;

export function cvProblem(file: { size: number; type: string } | null, noCv: boolean): string | null {
  if (!file || file.size === 0) return noCv ? null : 'Please upload your CV, or tick "I don\'t have a CV yet".';
  if (!CV_TYPES.includes(file.type)) return "Upload your CV as a PDF, Word document or photo.";
  if (file.size > MAX_CV_BYTES) return "That file is over 10 MB. Please upload a smaller file or a photo.";
  return null;
}

// A CV tailored to a job needs the client's current CV and the job: the job page it came from, the
// advert pasted in (text or a link), or a photo / PDF of it. Field name → what's missing.
export function tailoringProblems(order: {
  hasCv: boolean;
  fromJobPage: boolean;
  jobAdvert: string;
  hasAdvertFile: boolean;
}): Record<string, string> {
  const problems: Record<string, string> = {};
  if (!order.hasCv) problems.cv = "Please upload the CV you'd like tailored.";
  if (!order.fromJobPage && order.jobAdvert.trim().length < 10 && !order.hasAdvertFile)
    problems.jobAdvert = "Paste the job advert or a link to it, or upload a photo of it.";
  return problems;
}

// Placing many orders quickly from one visitor looks like abuse (each one stores a file)
export const PLACE_LIMIT = { orders: 5, minutes: 60 };
