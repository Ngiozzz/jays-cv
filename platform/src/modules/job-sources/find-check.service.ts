import "server-only";
import { AiUnavailableError, checkFinds } from "@/modules/ai/claude";
import { FIND_CHECK_BATCH, type FindCheck, type FindVerdict } from "@/modules/ai/find-check";
import { aiStopped } from "@/modules/ai/tokens";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import { jobDraftSchema } from "@/modules/jobs/jobs.schema";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { tenantDb } from "@/lib/tenant-db";

// "AI check": the AI's second look at jobs the sources found and that are waiting to be checked.
// Not a job, closed or staff-only adverts are set aside with the AI's reason (kept a week, so they can
// be restored); real jobs and the unsure ones stay for a person, marked with what the AI thought.

// What each verdict does to the job: set aside with this discard reason, or kept (null)
const SET_ASIDE: Record<FindVerdict, string | null> = {
  job: null,
  unsure: null,
  "not-a-job": "not-a-job",
  closed: "expired",
  internal: "other",
};

export type FindCheckOutcome =
  { ok: true; checked: number; setAside: number; left: number } | { ok: false; error: string };

// The deadline is known for sure: a job whose deadline hasn't passed is never set aside as closed
// (the AI sometimes muddles dates); it stays for a person instead
export function trustDeadline(check: FindCheck, deadline: string | null, today: string): FindCheck {
  if (check.verdict === "closed" && deadline && deadline >= today) {
    return { verdict: "unsure", reason: `The AI thought it was closed, but the deadline (${deadline}) hasn't passed.` };
  }
  return check;
}

// Jobs found by a source, read, waiting to be checked, and not looked at by the AI yet
function waitingUnchecked(tenantId: string) {
  return tenantDb(tenantId).inboxItem.findMany({
    where: { state: "CHECK", jobSourceId: { not: null }, aiCheckedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, reading: true, rawText: true, source: true, pageUrl: true, readError: true },
  });
}

export async function countUnchecked(tenantId: string): Promise<number> {
  return tenantDb(tenantId).inboxItem.count({
    where: { state: "CHECK", jobSourceId: { not: null }, aiCheckedAt: null },
  });
}

// Checks the next batch; the screen (or the morning run) calls it again until none are left
export async function checkNextFinds(tenantId: string, memberId: string | null): Promise<FindCheckOutcome> {
  const stopped = aiStopped(await getTokenBalance(tenantId));
  if (stopped === "paused") return { ok: false, error: "The AI is paused." };
  if (stopped) return { ok: false, error: "Your AI tokens have run out." };

  const all = await waitingUnchecked(tenantId);
  const db = tenantDb(tenantId);
  // A job whose page couldn't be read has nothing to judge: it stays for a person, marked checked
  const unreadable = all.filter((item) => item.readError || !jobDraftSchema.safeParse(item.reading).success);
  for (const item of unreadable) {
    await db.inboxItem.update({
      where: { id: item.id },
      data: { aiCheck: "unsure", aiCheckReason: "The page couldn't be read.", aiCheckedAt: new Date() },
    });
  }
  const batch = all.filter((item) => !unreadable.includes(item)).slice(0, FIND_CHECK_BATCH);
  if (!batch.length) return { ok: true, checked: unreadable.length, setAside: 0, left: 0 };

  const today = todayInNairobi();
  const inputs = batch.map((item) => {
    const job = jobDraftSchema.parse(item.reading);
    return {
      title: job.title,
      company: job.company,
      deadline: job.openEnded ? null : job.deadline,
      summary: job.summary,
      source: item.source,
      pageUrl: item.pageUrl,
      advert: item.rawText,
    };
  });
  try {
    const { data, usage } = await checkFinds(inputs, today);
    if (usage) await recordUsage(tenantId, { feature: "Job sources check", memberId, ...usage });
    let setAside = 0;
    for (const [index, item] of batch.entries()) {
      const { verdict, reason } = trustDeadline(data[index], inputs[index].deadline, today);
      const discardReason = SET_ASIDE[verdict];
      if (discardReason) setAside += 1;
      await db.inboxItem.update({
        where: { id: item.id },
        data: {
          aiCheck: verdict,
          aiCheckReason: reason || null,
          aiCheckedAt: new Date(),
          ...(discardReason ? { state: "DISCARDED", discardReason, decidedAt: new Date() } : {}),
        },
      });
    }
    return {
      ok: true,
      checked: batch.length + unreadable.length,
      setAside,
      left: all.length - unreadable.length - batch.length,
    };
  } catch (error) {
    if (error instanceof AiUnavailableError) return { ok: false, error: error.message };
    throw error;
  }
}
