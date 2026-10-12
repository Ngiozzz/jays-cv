import "server-only";
import { fileStore } from "@/lib/storage";
import { findSettings } from "@/modules/content/content.repo";
import { deleteInboxItems, findOldDiscarded } from "@/modules/inbox/inbox.repo";
import { listTenantIds } from "@/modules/tenants/tenants.repo";
import * as repo from "./jobs.repo";
import { todayInNairobi } from "./jobs.rules";
import { posterExpired } from "./poster-retention";

// Run nightly (see src/app/api/cron/cleanup-posters): deletes posters of jobs that closed longer ago
// than each business's "keep posters for N months" setting, so storage stays small as jobs pile up.
export async function cleanUpOldPosters(now = new Date()): Promise<{ tenant: string; deleted: number }[]> {
  const today = todayInNairobi(now);
  const results = [];
  for (const tenant of await listTenantIds()) {
    const settings = await findSettings(tenant.id).catch(() => null);
    if (!settings) continue;
    const posters = await repo.findPostersWithJobs(tenant.id);
    const expired = posters.filter(
      ({ job }) =>
        job &&
        posterExpired(
          {
            status: job.status,
            deadline: job.deadline ? job.deadline.toISOString().slice(0, 10) : null,
            updatedDay: todayInNairobi(job.updatedAt),
          },
          today,
          settings.posterRetentionMonths,
        ),
    );
    for (const poster of expired) await fileStore.remove("job-posters", poster.storagePath);
    if (expired.length)
      await repo.deleteFileRecords(
        tenant.id,
        expired.map((poster) => poster.id),
      );
    const discarded = await deleteOldDiscardedPosters(tenant.id, now);
    results.push({ tenant: tenant.slug, deleted: expired.length + discarded });
  }
  return results;
}

// Discarded inbox posters are kept a week (so they can be restored), then removed
const DISCARD_KEEP_MS = 7 * 86_400_000;

async function deleteOldDiscardedPosters(tenantId: string, now: Date): Promise<number> {
  const old = await findOldDiscarded(tenantId, new Date(now.getTime() - DISCARD_KEEP_MS));
  for (const item of old) await fileStore.remove("job-posters", item.posterPath);
  if (old.length)
    await deleteInboxItems(
      tenantId,
      old.map((item) => item.id),
    );
  return old.length;
}
