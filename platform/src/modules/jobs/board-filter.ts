import { OUTSIDE_KENYA, inCounty, isCounty } from "./counties";
import { daysUntil } from "./jobs.rules";
import type { ApplyMethod } from "./jobs.schema";

// Searching and filtering the public jobs board (runs in the browser, so it must stay pure)

export type BoardJob = {
  title: string;
  company: string;
  location: string;
  counties: string[];
  type: string;
  category: string;
  summary: string;
  tags: string[];
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

// The counties in the board's location filter: those with jobs, A to Z, then "Outside Kenya".
// Nationwide and "Not specified" jobs don't add a choice (nationwide ones show under every county).
export function boardPlaces(jobs: Pick<BoardJob, "counties">[]): string[] {
  const all = new Set(jobs.flatMap((job) => job.counties));
  const counties = [...all].filter(isCounty).sort();
  return all.has(OUTSIDE_KENYA) ? [...counties, OUTSIDE_KENYA] : counties;
}

// A county from the filter, or (from an older shared link) a town typed into the location
const atPlace = (job: BoardJob, place: string) =>
  inCounty(job.counties, place) || job.location.toLowerCase().includes(place.toLowerCase());

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
        [job.title, job.company, job.category, job.location, job.summary, ...job.tags]
          .join(" ")
          .toLowerCase()
          .includes(term)) &&
      (!filters.loc || atPlace(job, filters.loc)) &&
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
  logoUrl: string | null;
};

export function toBoardListing(
  job: BoardJob & { slug: string; salary: string | null; logoUrl: string | null; apply: { method: ApplyMethod } },
): BoardListing {
  return {
    slug: job.slug,
    title: job.title,
    company: job.company,
    location: job.location,
    counties: job.counties,
    type: job.type,
    category: job.category,
    salary: job.salary,
    summary: job.summary,
    tags: job.tags,
    deadline: job.deadline,
    postedDay: job.postedDay,
    applyMethod: job.apply.method,
    logoUrl: job.logoUrl,
  };
}
