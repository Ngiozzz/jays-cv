import { daysUntil } from "./jobs.rules";
import type { ApplyMethod } from "./jobs.schema";

// Searching and filtering the public jobs board (runs in the browser, so it must stay pure)

export type BoardJob = {
  title: string;
  company: string;
  location: string;
  type: string;
  category: string;
  summary: string;
  deadline: string | null;
  postedDay: string;
};

export type BoardFilters = {
  q: string;
  loc: string;
  cat: string;
  types: string[];
  soon: boolean;
  sort: "newest" | "closing";
};

export const NO_FILTERS: BoardFilters = { q: "", loc: "", cat: "", types: [], soon: false, sort: "newest" };

// "Nairobi (Mombasa Road) & Kisumu" → ["Nairobi", "Kisumu"]: the places a job can be filtered by
export function placesOf(location: string): string[] {
  return location
    .split("(")[0]
    .split(/&|,/)
    .map((place) => place.trim())
    .filter((place) => place && !place.startsWith("["));
}

export function countBy<T extends BoardJob>(jobs: T[], key: "category" | "type"): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const job of jobs) counts[job[key]] = (counts[job[key]] ?? 0) + 1;
  return counts;
}

export function filterJobs<T extends BoardJob>(jobs: T[], filters: BoardFilters, today: string): T[] {
  const term = filters.q.trim().toLowerCase();
  const closesWithinWeek = (job: T) => job.deadline !== null && daysUntil(job.deadline, today) <= 7;
  const list = jobs.filter(
    (job) =>
      (!term ||
        [job.title, job.company, job.category, job.location, job.summary].join(" ").toLowerCase().includes(term)) &&
      (!filters.loc || job.location.includes(filters.loc)) &&
      (!filters.cat || job.category === filters.cat) &&
      (!filters.types.length || filters.types.includes(job.type)) &&
      (!filters.soon || closesWithinWeek(job)),
  );
  // Open-ended jobs go last when sorting by closing date
  const closingOrder = (job: T) => (job.deadline ? daysUntil(job.deadline, today) : Number.MAX_SAFE_INTEGER);
  return filters.sort === "closing"
    ? list.sort((a, b) => closingOrder(a) - closingOrder(b))
    : list.sort((a, b) => b.postedDay.localeCompare(a.postedDay));
}

// One job on the board list: only what the list and its filters need, so the page stays light on mobile data
export type BoardListing = BoardJob & {
  slug: string;
  salary: string | null;
  applyMethod: ApplyMethod;
};

export function toBoardListing(
  job: BoardJob & { slug: string; salary: string | null; apply: { method: ApplyMethod } },
): BoardListing {
  return {
    slug: job.slug,
    title: job.title,
    company: job.company,
    location: job.location,
    type: job.type,
    category: job.category,
    salary: job.salary,
    summary: job.summary,
    deadline: job.deadline,
    postedDay: job.postedDay,
    applyMethod: job.apply.method,
  };
}
