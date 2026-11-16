import { sameWords, similar } from "@/modules/inbox/inbox.flags";

// The same job found twice: by a job source and already on the board (posted from a WhatsApp
// poster, say), or by two sources. Pure, so it can be tested.

export type Comparable = { title: string; company: string; deadline: string | null };

// A sure match: the same job title (word for word), a similar company name and the same deadline (or
// neither has one). Jobs that only look alike ("Member (Advocate)" and "Member (Non-Advocate)") are
// left for a person: Bulk post flags them as a possible duplicate.
export function sureDuplicate<T extends Comparable>(job: Comparable, others: T[]): T | null {
  if (!job.title.trim() || !job.company.trim()) return null;
  return (
    others.find(
      (other) =>
        (other.deadline ?? null) === (job.deadline ?? null) &&
        similar(other.company, job.company) &&
        sameWords(other.title, job.title),
    ) ?? null
  );
}
