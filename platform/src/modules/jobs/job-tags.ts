import { tagSlug } from "./jobs.schema";

// Tag pages ("CPA jobs in Kenya" at /jobs/tag/cpa): which open jobs carry a tag, and what to call it.
// Pure, so it's unit-tested.

type Tagged = { tags: string[] };

export function jobsWithTag<T extends Tagged>(jobs: T[], slug: string): T[] {
  return jobs.filter((job) => job.tags.some((tag) => tagSlug(tag) === slug));
}

// The spelling most jobs use ("CPA", not "cpa"); from the address if no job has the tag any more
export function tagName(jobs: Tagged[], slug: string): string {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    for (const tag of job.tags) if (tagSlug(tag) === slug) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best) return best[0];
  const words = slug.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function allTagSlugs(jobs: Tagged[]): string[] {
  return [...new Set(jobs.flatMap((job) => job.tags.map(tagSlug)).filter(Boolean))];
}

// How many tags two jobs share: "Similar jobs" puts the closest matches first
export function sharedTags(a: Tagged, b: Tagged): number {
  const mine = new Set(a.tags.map(tagSlug));
  return b.tags.filter((tag) => mine.has(tagSlug(tag))).length;
}
