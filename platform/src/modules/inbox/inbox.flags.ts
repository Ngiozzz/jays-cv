import type { ReadingField } from "@/modules/ai/poster-reading";
import { daysUntil, formatDay } from "@/modules/jobs/jobs.rules";
import type { ApplyMethod, JobInput } from "@/modules/jobs/jobs.schema";

// The checks every poster gets before someone approves it. Pure, so the same rules run on the
// server and live in the browser while the team corrects a poster.

export type FlagLevel = "critical" | "warning" | "info";
export type FlagKey = "scam" | "duplicate" | "no-deadline" | "expired" | "closes-soon" | "unsure" | "missing";
export type Flag = { key: FlagKey; level: FlagLevel; text: string; more: string };

export const FIELD_LABEL: Record<ReadingField, string> = {
  title: "Job title",
  company: "Company",
  location: "Location",
  category: "Category",
  type: "Job type",
  workMode: "Work setting",
  deadline: "Deadline",
  apply: "How to apply",
  summary: "About the role",
  requirements: "Requirements",
};

// The one field that says where applications go, for each way of applying
export const APPLY_TARGET: Record<ApplyMethod, "email" | "url" | "phone" | "address" | "notes"> = {
  email: "email",
  link: "url",
  whatsapp: "phone",
  "in-person": "address",
  other: "notes",
};

export type FlagContext = {
  today: string;
  rawText: string;
  unsure: string[];
  checked: string[];
  // Jobs on the website, and other posters in the inbox that came in earlier
  liveJobs: { title: string; company: string; postedDay: string }[];
  earlierPosters: { title: string; company: string }[];
};

// ---------- duplicates: same company and a similar title ----------

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(ltd|limited|the|kenya|plc|co|posts?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const wordsOf = (text: string) =>
  new Set(
    normalise(text)
      .split(" ")
      .filter((w) => w.length > 2 && !/^\d+$/.test(w)),
  );

export function similar(a: string, b: string): boolean {
  const left = wordsOf(a);
  const right = wordsOf(b);
  if (!left.size || !right.size) return false;
  let shared = 0;
  left.forEach((word) => {
    if (right.has(word)) shared++;
  });
  return shared / Math.min(left.size, right.size) >= 0.6;
}

const sameJob = (a: { title: string; company: string }, b: { title: string; company: string }) =>
  similar(a.company, b.company) && similar(a.title, b.title);

// ---------- scams: two or more warning signs together ----------

export function scamSigns(rawText: string, salary: string): string[] {
  const signs: string[] = [];
  if (
    /(registration|processing|application|interview|medical)\s+fee|pay\s+(a\s+)?(fee|kes|ksh)|send\s+(money|kes|ksh)/i.test(
      rawText,
    )
  ) {
    signs.push("asks applicants to pay a fee");
  }
  const pay = parseInt(salary.replace(/\D/g, ""), 10);
  if (/no experience/i.test(rawText) && pay >= 60000) signs.push(`offers ${salary} with no experience needed`);
  if (/0\d{3}\s?\d{3}\s?\d{3}/.test(rawText) && !/@|https?:|\.co\.ke|\.com|\.org/i.test(rawText)) {
    signs.push("gives only a personal phone number (no company email or website)");
  }
  if (/urgent|hurry|slots only/i.test(rawText)) signs.push("pushes people to act fast");
  return signs;
}

// ---------- missing details ----------

export function missingDetails(job: JobInput): string[] {
  const missing: string[] = [];
  if (!job.title.trim()) missing.push("Job title");
  if (!job.company.trim()) missing.push("Company");
  if (!job.location.trim()) missing.push("Location");
  if (!job.apply[APPLY_TARGET[job.apply.method]].trim()) missing.push("How to apply");
  return missing;
}

function deadlineFlag(job: JobInput, today: string): Flag | null {
  if (!job.deadline && !job.openEnded) {
    return {
      key: "no-deadline",
      level: "warning",
      text: "No deadline",
      more: 'The poster has no closing date. Set one, or tick "Open until filled".',
    };
  }
  if (!job.deadline) return null;
  const days = daysUntil(job.deadline, today);
  if (days < 0) {
    return {
      key: "expired",
      level: "critical",
      text: "Deadline passed",
      more: `Applications closed on ${formatDay(job.deadline)}.`,
    };
  }
  if (days <= 3) {
    return {
      key: "closes-soon",
      level: "info",
      text: days === 0 ? "Closes today" : `Closes in ${days} day${days > 1 ? "s" : ""}`,
      more: "Worth sharing on the channel today.",
    };
  }
  return null;
}

export function flagsFor(job: JobInput, context: FlagContext): Flag[] {
  const flags: Flag[] = [];
  const scam = scamSigns(context.rawText, job.salary);
  if (scam.length >= 2) {
    flags.push({
      key: "scam",
      level: "critical",
      text: "Possible scam",
      more: `This advert ${scam.join("; ")}. Real employers never charge people to apply.`,
    });
  }

  const onSite = context.liveJobs.find((live) => sameJob(live, job));
  const inInbox = !onSite && context.earlierPosters.find((other) => sameJob(other, job));
  if (onSite) {
    flags.push({
      key: "duplicate",
      level: "warning",
      text: "Duplicate",
      more: `Already on the website: ${onSite.title} · ${onSite.company} (posted ${formatDay(onSite.postedDay)}).`,
    });
  } else if (inInbox) {
    flags.push({
      key: "duplicate",
      level: "warning",
      text: "Duplicate",
      more: `Same as another poster in the inbox: ${inInbox.title} · ${inInbox.company}.`,
    });
  }

  const deadline = deadlineFlag(job, context.today);
  if (deadline) flags.push(deadline);

  const unsure = context.unsure.filter((field) => !context.checked.includes(field));
  if (unsure.length) {
    const labels = unsure.map((field) => FIELD_LABEL[field as ReadingField] ?? field);
    flags.push({
      key: "unsure",
      level: "warning",
      text: `Check ${unsure.length} field${unsure.length > 1 ? "s" : ""}`,
      more: `The AI wasn't sure about: ${labels.join(", ")}. Compare with the poster.`,
    });
  }

  const missing = missingDetails(job);
  if (missing.length) {
    flags.push({ key: "missing", level: "warning", text: "Missing details", more: `Fill in: ${missing.join(", ")}.` });
  }
  return flags;
}

// "Clean" posters can be approved straight away; anything above an info note goes to Flagged
export const isClean = (flags: Flag[]) => flags.every((flag) => flag.level === "info");

// Flags that need an extra "are you sure?" before publishing
export const NEEDS_CONFIRMING: FlagKey[] = ["scam", "duplicate", "expired"];
