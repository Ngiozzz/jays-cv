import { z } from "zod";
import {
  APPLY_METHODS,
  ATTACH_OPTIONS,
  JOB_CATEGORIES,
  JOB_TYPES,
  WORK_MODES,
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
    "If the image is not a job advert, set isJobAdvert to false and leave the other fields empty.",
  ].join("\n");
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
