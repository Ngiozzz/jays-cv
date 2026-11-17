import "server-only";
import { aiStopped } from "@/modules/ai/tokens";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { claimForReading, findInboxItem } from "@/modules/inbox/inbox.repo";
import { readClaimedItem } from "@/modules/inbox/inbox.service";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { listTenantIds } from "@/modules/tenants/tenants.repo";
import type { RobotsCache } from "./fetch";
import { checkNextFinds } from "./find-check.service";
import { checkSource } from "./job-sources.service";
import * as repo from "./job-sources.repo";

// The morning run (Vercel Cron, see vercel.json): for each business that has switched it on, check
// every source not yet checked today, then read the new jobs with the AI, so they wait in Bulk post
// ready to check. A run stops starting new work before the time limit; the next run (an hour later)
// carries on where it stopped, and overlapping runs never do the same work twice.

// Sources checked, and jobs read, at the same time: quick enough, without overloading the AI
const AT_ONCE = 3;

export type MorningResult = {
  tenant: string;
  checked: number;
  added: number;
  read: number;
  // Jobs the AI check looked at, and how many it set aside
  aiChecked: number;
  setAside: number;
  // Why it stopped early, if it did ("time", "tokens")
  stopped: string | null;
};

// Midnight in Nairobi, as a moment in time
export function startOfNairobiDay(now: Date): Date {
  return new Date(`${todayInNairobi(now)}T00:00:00+03:00`);
}

export async function morningRun(deadline: number, now = new Date()): Promise<MorningResult[]> {
  const results: MorningResult[] = [];
  const timeLeft = () => Date.now() < deadline;
  for (const tenant of await listTenantIds()) {
    if (!(await repo.morningRunOn(tenant.id))) continue;
    const result: MorningResult = {
      tenant: tenant.slug,
      checked: 0,
      added: 0,
      read: 0,
      aiChecked: 0,
      setAside: 0,
      stopped: null,
    };
    results.push(result);

    // 1. Check the sources: three different sites at a time (each site is still read one page at a time)
    const robots: RobotsCache = new Map();
    const startOfToday = startOfNairobiDay(now);
    const checker = async () => {
      while (timeLeft() && !result.stopped) {
        const sourceId = await repo.claimSourceForToday(tenant.id, startOfToday);
        if (!sourceId) return;
        const outcome = await checkSource(tenant.id, sourceId, null, { robots });
        result.checked += 1;
        if (outcome.ok) result.added += outcome.added;
        // Out of AI tokens or AI paused: nothing more can be done today
        else if (!outcome.counted) result.stopped = "tokens";
      }
    };
    await Promise.all(Array.from({ length: AT_ONCE }, checker));
    if (result.stopped) continue;

    // 2. Read the waiting jobs, three at a time, so they are ready to check
    const taken = new Set<string>();
    const reader = async () => {
      while (timeLeft() && !result.stopped) {
        if (aiStopped(await getTokenBalance(tenant.id))) {
          result.stopped = "tokens";
          return;
        }
        const next = await repo.nextWaitingSourceItem(tenant.id, [...taken]);
        if (!next) return;
        taken.add(next.id);
        // Someone may be reading it on the Bulk post screen right now
        if (!(await claimForReading(tenant.id, next.id))) continue;
        const item = await findInboxItem(tenant.id, next.id);
        if (!item) continue;
        await readClaimedItem(tenant.id, item, null);
        result.read += 1;
      }
    };
    await Promise.all(Array.from({ length: AT_ONCE }, reader));

    // 3. The AI's second look: lists of links, old and staff-only adverts are set aside
    while (timeLeft() && !result.stopped) {
      const outcome = await checkNextFinds(tenant.id, null);
      if (!outcome.ok) {
        if (/tokens|paused/i.test(outcome.error)) result.stopped = "tokens";
        break;
      }
      result.aiChecked += outcome.checked;
      result.setAside += outcome.setAside;
      if (!outcome.left || !outcome.checked) break;
    }
    if (!result.stopped && !timeLeft()) result.stopped = "time";
  }
  return results;
}
