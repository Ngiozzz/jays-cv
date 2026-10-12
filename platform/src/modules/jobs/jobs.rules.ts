// Pure rules for how jobs are shown and named. Dates are calendar days in Kenya ("YYYY-MM-DD"),
// so "closes today" means today in Nairobi, wherever the server runs.

export type JobDisplayStatus = "published" | "draft" | "expired";

export function todayInNairobi(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

const DAY_MS = 86_400_000;
const dayNumber = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS;

export function daysUntil(deadline: string, today: string): number {
  return Math.round(dayNumber(deadline) - dayNumber(today));
}

// A published job whose deadline has passed hides itself from the website: it shows as "expired"
export function displayStatus(job: { status: string; deadline: string | null }, today: string): JobDisplayStatus {
  if (job.status === "DRAFT" || job.status === "ARCHIVED") return "draft";
  if (job.deadline && daysUntil(job.deadline, today) < 0) return "expired";
  return "published";
}

export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function deadlineLabel(
  deadline: string | null,
  today: string,
): { text: string; tone: "" | "urgent" | "closed" } {
  if (!deadline) return { text: "Open until filled", tone: "" };
  const days = daysUntil(deadline, today);
  if (days < 0) return { text: `Closed ${formatDay(deadline)}`, tone: "closed" };
  if (days === 0) return { text: "Closes today", tone: "urgent" };
  if (days === 1) return { text: "Closes tomorrow", tone: "urgent" };
  if (days <= 3) return { text: `Closes in ${days} days`, tone: "urgent" };
  return { text: `Closes ${formatDay(deadline)}`, tone: "" };
}

export function postedLabel(postedDay: string, today: string): string {
  const days = -daysUntil(postedDay, today);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// "I.T Specialist" at "Kilimall" → "it-specialist-kilimall": readable job page addresses for Google
export function slugify(...parts: string[]): string {
  return (
    parts
      .join(" ")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/, "") || "job"
  );
}

export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// Company initials for the coloured logo square, as in the preview
export function companyInitials(company: string): string {
  return (
    company
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function companyHue(company: string): number {
  return [...company].reduce((hue, char) => (hue * 31 + char.charCodeAt(0)) % 360, 7);
}
