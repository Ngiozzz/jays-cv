import { z } from "zod";

// Choices offered on the "Post a job" form (same lists as the preview)
export const JOB_CATEGORIES = [
  "IT & Tech",
  "Finance & Accounting",
  "Healthcare",
  "NGO & Development",
  "Sales & Marketing",
  "Hospitality",
  "Engineering & Safety",
  "Education",
  "Admin & Office",
  "Transport & Logistics",
  "Other",
] as const;
export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Graduate / Internship", "Volunteer"] as const;
export const WORK_MODES = ["On-site", "Hybrid", "Remote", "Field"] as const;
export const APPLY_METHODS = ["email", "link", "whatsapp", "in-person", "other"] as const;
export const ATTACH_OPTIONS = [
  "CV",
  "Cover letter",
  "Certificates",
  "ID copy",
  "Portfolio / GitHub",
  "Testimonials",
] as const;

export type ApplyMethod = (typeof APPLY_METHODS)[number];

const text = (max: number) => z.string().trim().max(max).default("");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

// How to apply. One flat shape for every method, so a half-finished draft can still be saved;
// the publish rules below decide which fields each method needs.
export const applySchema = z.object({
  method: z.enum(APPLY_METHODS).default("email"),
  email: text(200),
  subject: text(200),
  url: text(500),
  phone: text(40),
  address: text(300),
  when: text(200),
  attach: z.array(z.enum(ATTACH_OPTIONS)).default([]),
  notes: text(1000),
});

export type ApplyDetails = z.infer<typeof applySchema>;

// A draft only needs a title
export const jobDraftSchema = z.object({
  title: z.string().trim().min(2, "Add the job title").max(160),
  company: text(160),
  location: text(160),
  category: z.union([z.enum(JOB_CATEGORIES), z.literal("")]).default(""),
  type: z.enum(JOB_TYPES).default("Full-time"),
  workMode: z.enum(WORK_MODES).default("On-site"),
  salary: text(120),
  summary: text(1500),
  responsibilities: z.array(z.string().trim().min(1).max(500)).max(40).default([]),
  requirements: z.array(z.string().trim().min(1).max(500)).max(40).default([]),
  deadline: isoDate.nullable().default(null),
  openEnded: z.boolean().default(false),
  apply: applySchema,
  source: text(200),
});

export type JobInput = z.infer<typeof jobDraftSchema>;

const APPLY_REQUIRED: Record<ApplyMethod, { field: keyof ApplyDetails; message: string }> = {
  email: { field: "email", message: "Add the email address applications go to" },
  link: { field: "url", message: "Add the application link" },
  whatsapp: { field: "phone", message: "Add the WhatsApp or phone number" },
  "in-person": { field: "address", message: "Add where to apply" },
  other: { field: "notes", message: "Explain how to apply" },
};

// Everything a job seeker needs before a job goes live
export function publishProblems(job: JobInput): { path: string; message: string }[] {
  const problems: { path: string; message: string }[] = [];
  if (!job.company) problems.push({ path: "company", message: "Add the company" });
  if (!job.location) problems.push({ path: "location", message: "Add the location" });
  if (!job.deadline && !job.openEnded) {
    problems.push({ path: "deadline", message: 'Set a deadline, or tick "Open until filled"' });
  }
  const required = APPLY_REQUIRED[job.apply.method];
  if (!job.apply[required.field]) problems.push({ path: `apply.${required.field}`, message: required.message });
  if (job.apply.method === "email" && job.apply.email && !z.email().safeParse(job.apply.email).success) {
    problems.push({ path: "apply.email", message: "That email address doesn't look right" });
  }
  if (job.apply.method === "link" && job.apply.url && !z.url().safeParse(job.apply.url).success) {
    problems.push({ path: "apply.url", message: "The link must start with https://" });
  }
  return problems;
}

const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

// The "Post a job" form → the shape the schema checks. Responsibilities and requirements are one per line.
export function jobFormToInput(form: FormData): unknown {
  const openEnded = form.get("openEnded") === "on";
  return {
    title: field(form, "title"),
    company: field(form, "company"),
    location: field(form, "location"),
    category: field(form, "category"),
    type: field(form, "type") || undefined,
    workMode: field(form, "workMode") || undefined,
    salary: field(form, "salary"),
    summary: field(form, "summary"),
    responsibilities: lines(form.get("responsibilities")),
    requirements: lines(form.get("requirements")),
    deadline: openEnded ? null : field(form, "deadline") || null,
    openEnded,
    apply: {
      method: field(form, "applyMethod") || undefined,
      email: field(form, "applyEmail"),
      subject: field(form, "applySubject"),
      url: field(form, "applyUrl"),
      phone: field(form, "applyPhone"),
      address: field(form, "applyAddress"),
      when: field(form, "applyWhen"),
      attach: form.getAll("applyAttach").map(String),
      notes: field(form, "applyNotes"),
    },
    source: field(form, "source"),
  };
}

// What "Post a job" starts from
export const EMPTY_JOB: JobInput = {
  title: "",
  company: "",
  location: "",
  category: "",
  type: "Full-time",
  workMode: "On-site",
  salary: "",
  summary: "",
  responsibilities: [],
  requirements: [],
  deadline: null,
  openEnded: false,
  apply: {
    method: "email",
    email: "",
    subject: "",
    url: "",
    phone: "",
    address: "",
    when: "",
    attach: ["CV"],
    notes: "",
  },
  source: "",
};
