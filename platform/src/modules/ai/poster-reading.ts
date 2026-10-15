import { z } from "zod";
import {
  APPLY_METHODS,
  ATTACH_OPTIONS,
  JOB_CATEGORIES,
  JOB_TYPES,
  WORK_MODES,
  cleanTags,
  jobDraftSchema,
  type JobInput,
} from "@/modules/jobs/jobs.schema";

// Fields a person may need to check against the poster (shown as "AI wasn't sure")
export const READING_FIELDS = [
  "title",
  "company",
  "location",
  "category",
  "type",
  "workMode",
  "deadline",
  "apply",
  "summary",
  "requirements",
] as const;
export type ReadingField = (typeof READING_FIELDS)[number];

// The AI's second opinion on whether an advert is a scam, on top of the fixed rules in inbox.flags.ts
export const SCAM_RISKS = ["low", "medium", "high"] as const;
export type ScamRisk = (typeof SCAM_RISKS)[number];

// What the AI must return after reading a job poster. Kept to plain fields and fixed choices
// (no defaults or limits) so it works as a structured-output schema.
export const posterReadingSchema = z.object({
  isJobAdvert: z.boolean(),
  // Everything printed on the poster, as plain text (the scam checks look at this)
  rawText: z.string(),
  // Fields that were hard to read (blurry, cut off, ambiguous) and need a person to check
  unsureFields: z.array(z.enum(READING_FIELDS)),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  category: z.enum([...JOB_CATEGORIES, "Unknown"]),
  type: z.enum(JOB_TYPES),
  workMode: z.enum(WORK_MODES),
  salary: z.string(),
  summary: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(z.string()),
  // Search tags for the job's own pages ("CPA", "Nairobi", "Entry level")
  tags: z.array(z.string()),
  scamRisk: z.enum(SCAM_RISKS),
  scamReason: z.string(),
  deadline: z.string(),
  applyMethod: z.enum(APPLY_METHODS),
  applyEmail: z.string(),
  applySubject: z.string(),
  applyUrl: z.string(),
  applyPhone: z.string(),
  applyAddress: z.string(),
  applyWhen: z.string(),
  attach: z.array(z.enum(ATTACH_OPTIONS)),
  notes: z.string(),
});

export type PosterReading = z.infer<typeof posterReadingSchema>;

export function posterPrompt(today: string): string {
  return [
    "This image is a job advert (poster) shared with a Kenyan jobs board. Read it and fill in the job details.",
    `Today is ${today}. Write the application deadline as YYYY-MM-DD; if the poster gives no deadline, use an empty string.`,
    "Copy names, emails, phone numbers and links exactly as printed. Use an empty string for anything the poster doesn't say; never guess.",
    "Write the summary as one or two plain sentences in your own words. List responsibilities and requirements one item each, as printed.",
    'Choose the closest category, job type and work setting; use "Unknown" for the category if none fits.',
    "For how to apply, pick the method the poster asks for. Put any special instructions (e.g. 'state your expected salary') in notes.",
    "Put all the text printed on the poster, word for word, in rawText.",
    "List in unsureFields any field you could not read confidently (blurry, cut off or ambiguous), so a person checks it.",
    'Add 3 to 6 search tags, each 1 to 3 words, for the job seeker searching Google: the profession or qualification (e.g. "CPA", "Mechanical engineer", "Nurse"), the field (e.g. "Engineering"), the town (e.g. "Kericho"), and the level (e.g. "Entry level", "Internship", "Senior"). Each tag is shown as "<tag> jobs in Kenya", so never include the words "jobs" or "Kenya" in a tag. No hashtags.',
    "Judge whether the advert looks like a scam. Set scamRisk to high when it asks applicants to pay any fee or send money, promises pay far above the role with no experience needed, or hides the employer behind a personal number or free email for a big company; medium when something is unusual but could be genuine; otherwise low. In scamReason, say why in one plain sentence (empty when low).",
    "If the image is not a job advert, set isJobAdvert to false and leave the other fields empty.",
  ].join("\n");
}

// The AI's answer, read forgivingly: a model sometimes strays from the fixed choices (an unknown job
// type, a made-up field name). One stray value shouldn't lose the whole reading, so it's replaced by
// a safe choice and the field is flagged for a person to check. Only a non-object is refused.
export function parsePosterReading(raw: unknown): PosterReading | null {
  if (typeof raw !== "object" || raw === null) return null;
  const answer = raw as Record<string, unknown>;
  const text = (key: string) => (typeof answer[key] === "string" ? (answer[key] as string) : "");
  const list = (key: string) =>
    Array.isArray(answer[key]) ? (answer[key] as unknown[]).filter((item): item is string => typeof item === "string") : [];
  const unsure = new Set<ReadingField>(list("unsureFields").filter((f): f is ReadingField => isOneOf(READING_FIELDS, f)));
  function choice<T extends string>(key: string, options: readonly T[], fallback: T, flag: ReadingField): T {
    const value = text(key);
    if (isOneOf(options, value)) return value;
    unsure.add(flag);
    return fallback;
  }
  const reading = {
    isJobAdvert: answer.isJobAdvert !== false,
    rawText: text("rawText"),
    title: text("title"),
    company: text("company"),
    location: text("location"),
    category: choice("category", [...JOB_CATEGORIES, "Unknown"] as const, "Unknown", "category"),
    type: choice("type", JOB_TYPES, "Full-time", "type"),
    workMode: choice("workMode", WORK_MODES, "On-site", "workMode"),
    salary: text("salary"),
    summary: text("summary"),
    responsibilities: list("responsibilities"),
    requirements: list("requirements"),
    tags: cleanTags(list("tags").map(plainTag)),
    // A missing or unknown opinion counts as "low": the fixed rules still check every advert
    scamRisk: isOneOf(SCAM_RISKS, answer.scamRisk) ? answer.scamRisk : "low",
    scamReason: text("scamReason"),
    deadline: text("deadline"),
    applyMethod: choice("applyMethod", APPLY_METHODS, "other", "apply"),
    applyEmail: text("applyEmail"),
    applySubject: text("applySubject"),
    applyUrl: text("applyUrl"),
    applyPhone: text("applyPhone"),
    applyAddress: text("applyAddress"),
    applyWhen: text("applyWhen"),
    attach: list("attach").filter((item): item is (typeof ATTACH_OPTIONS)[number] => isOneOf(ATTACH_OPTIONS, item)),
    notes: text("notes"),
  };
  return { ...reading, unsureFields: READING_FIELDS.filter((field) => unsure.has(field)) };
}

// "Mechanical engineer jobs Kenya" → "Mechanical engineer": the tag page adds "jobs in Kenya" itself
function plainTag(tag: string): string {
  return tag.replace(/\b(jobs?|vacanc(y|ies)|in kenya|kenya)\b/gi, " ").replace(/\s+/g, " ").trim();
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

// The AI's reading → the job form's shape. Anything odd (a bad date, empty title) is cleaned up here.
export function readingToJobInput(reading: PosterReading): JobInput {
  return jobDraftSchema.parse({
    title: reading.title.trim() || "Untitled job",
    company: reading.company,
    location: reading.location,
    category: reading.category === "Unknown" ? "" : reading.category,
    type: reading.type,
    workMode: reading.workMode,
    salary: reading.salary,
    summary: reading.summary,
    responsibilities: reading.responsibilities.map((item) => item.trim()).filter(Boolean),
    requirements: reading.requirements.map((item) => item.trim()).filter(Boolean),
    tags: reading.tags,
    deadline: isoDate.test(reading.deadline) ? reading.deadline : null,
    openEnded: !isoDate.test(reading.deadline),
    apply: {
      method: reading.applyMethod,
      email: reading.applyEmail,
      subject: reading.applySubject,
      url: reading.applyUrl,
      phone: reading.applyPhone,
      address: reading.applyAddress,
      when: reading.applyWhen,
      attach: reading.attach,
      notes: reading.notes,
    },
    source: "",
  });
}

// "Pretend" mode (no Claude key yet): the Kilimall sample from the design preview,
// so the button can be tried without spending tokens
export const PRETEND_READING: PosterReading = {
  isJobAdvert: true,
  rawText: "Kilimall is hiring I.T Specialist. Send CV to recruitment@kilimall.com subject I.T SPECIALIST.",
  unsureFields: [],
  title: "I.T Specialist",
  company: "Kilimall",
  location: "Nairobi (Mombasa Road)",
  category: "IT & Tech",
  type: "Full-time",
  workMode: "On-site",
  salary: "",
  summary:
    "Kilimall is looking for an experienced I.T Specialist to run end-to-end IT operations across its offices and warehouse, from networks and CCTV to user support and team training.",
  responsibilities: [
    "Keep power, network and internet connectivity reliable across all locations",
    "Maintain warehouse IT systems: WMS, scanners and printers",
    "Set up and troubleshoot computers, printers and network devices",
    "Run CCTV and security systems",
    "Manage user accounts and access rights",
  ],
  requirements: [
    "Bachelor's degree in Information Technology, Computer Science or a related field",
    "At least 5 years of experience in IT operations, infrastructure or support roles",
    "Experience with multi-site IT environments",
  ],
  tags: ["IT Specialist", "IT Support", "Nairobi", "Experienced"],
  scamRisk: "low",
  scamReason: "",
  deadline: "",
  applyMethod: "email",
  applyEmail: "recruitment@kilimall.com",
  applySubject: "I.T SPECIALIST",
  applyUrl: "",
  applyPhone: "",
  applyAddress: "",
  applyWhen: "",
  attach: ["CV", "Cover letter"],
  notes: "State your current and expected remuneration in your CV. Only shortlisted candidates will be contacted.",
};
