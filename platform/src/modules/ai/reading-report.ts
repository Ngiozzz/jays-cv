import { isNoLocation, type JobInput } from "@/modules/jobs/jobs.schema";

// After the AI reads a poster: what it filled in, what the poster didn't say, and what it wasn't
// sure about, so the person posting knows exactly what to check. Pure, so it's unit-tested.

export type ReportItem = {
  // The reading field ("title", "apply"...), used to jump to the right input
  key: string;
  label: string;
  // What happens when it's left as it is, for missing fields
  note?: string;
  // Missing and needed before the job can be published
  needed?: boolean;
};

export type ReadingReport = { filled: ReportItem[]; missing: ReportItem[]; unsure: ReportItem[] };

const LABELS: Record<string, string> = {
  title: "Job title",
  company: "Company",
  location: "Location",
  category: "Category",
  type: "Job type",
  workMode: "Work setting",
  salary: "Salary",
  summary: "About the role",
  responsibilities: "Responsibilities",
  requirements: "Requirements",
  tags: "Search tags",
  deadline: "Deadline",
  apply: "How to apply",
};

export function readingReport(job: JobInput, unsure: readonly string[]): ReadingReport {
  const a = job.apply;
  const applyFound = Boolean(a.email || a.url || a.phone || a.address || a.notes);
  const missing: ReportItem[] = [];
  const found: string[] = ["type", "workMode"];
  const check = (key: string, ok: boolean, note?: string, needed?: boolean) => {
    if (ok) found.push(key);
    else missing.push({ key, label: LABELS[key], note, needed });
  };

  check("title", Boolean(job.title.trim()) && job.title !== "Untitled job", "Type the job title.", true);
  check("company", Boolean(job.company.trim()), 'Type the company, or describe it ("Private hospital").', true);
  check("location", !isNoLocation(job), 'Shown as "Not specified". Choose the county if you know it.');
  check("category", Boolean(job.category), "Choose one so the job shows under the right category.");
  check("salary", Boolean(job.salary.trim()), "Left blank. That's normal: most adverts don't say.");
  check("summary", Boolean(job.summary.trim()), "A sentence or two helps the job show on Google.");
  check("responsibilities", job.responsibilities.length > 0, "Add them if the poster lists any.");
  check("requirements", job.requirements.length > 0, "Add them if the poster lists any.");
  check("tags", job.tags.length > 0, "Add a few so the job gets its own search pages.");
  check("deadline", !job.openEnded && Boolean(job.deadline), 'Set to "Open until filled". Add a date if there is one.');
  check("apply", applyFound, "The job can't be published until it says how to apply.", true);

  const isUnsure = (key: string) => unsure.includes(key);
  return {
    filled: Object.keys(LABELS)
      .filter((key) => found.includes(key) && !isUnsure(key))
      .map((key) => ({ key, label: LABELS[key] })),
    missing: missing.filter((item) => !isUnsure(item.key)),
    unsure: unsure.filter((key) => LABELS[key]).map((key) => ({ key, label: LABELS[key] })),
  };
}
