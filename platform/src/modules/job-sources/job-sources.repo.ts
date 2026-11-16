import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { tenantDb } from "@/lib/tenant-db";

export function findSource(tenantId: string, id: string) {
  return tenantDb(tenantId).jobSource.findUnique({ where: { id } });
}

export function listSources(tenantId: string) {
  return tenantDb(tenantId).jobSource.findMany({ orderBy: { createdAt: "asc" } });
}

export function enabledSources(tenantId: string) {
  return tenantDb(tenantId).jobSource.findMany({ where: { enabled: true }, orderBy: { createdAt: "asc" } });
}

export function createSource(tenantId: string, data: Omit<Prisma.JobSourceUncheckedCreateInput, "tenantId">) {
  return tenantDb(tenantId).jobSource.create({ data: { ...data, tenantId } });
}

export function updateSource(tenantId: string, id: string, data: Prisma.JobSourceUncheckedUpdateInput) {
  return tenantDb(tenantId).jobSource.update({ where: { id }, data });
}

// The extra sites this business has banned (on top of the built-in list)
export async function extraBannedSites(tenantId: string): Promise<string[]> {
  const settings = await tenantDb(tenantId).businessSettings.findFirst({ select: { bannedJobSites: true } });
  return settings?.bannedJobSites ?? [];
}

// Which of these links any of the business's sources has already looked at
export async function seenUrls(tenantId: string, urls: string[]): Promise<Set<string>> {
  if (!urls.length) return new Set();
  const rows = await tenantDb(tenantId).seenJobLink.findMany({
    where: { url: { in: [...new Set(urls)] } },
    select: { url: true },
  });
  return new Set(rows.map((row) => row.url));
}

// Links are remembered for SEEN_KEEP_DAYS; an advert still listed after that is offered again
// (by then it is usually a new round of the same job)
export const SEEN_KEEP_DAYS = 183;

export function deleteOldSeenLinks(tenantId: string, now = new Date()) {
  return tenantDb(tenantId).seenJobLink.deleteMany({
    where: { seenAt: { lt: new Date(now.getTime() - SEEN_KEEP_DAYS * 86_400_000) } },
  });
}

export function markSeen(tenantId: string, jobSourceId: string, links: { url: string; isJob: boolean }[]) {
  if (!links.length) return Promise.resolve({ count: 0 });
  return tenantDb(tenantId).seenJobLink.createMany({
    data: links.map((link) => ({ tenantId, jobSourceId, url: link.url, isJob: link.isJob })),
    skipDuplicates: true,
  });
}

// ---- The morning run ----

export async function morningRunOn(tenantId: string): Promise<boolean> {
  const settings = await tenantDb(tenantId).businessSettings.findFirst({ select: { jobSourcesMorning: true } });
  return settings?.jobSourcesMorning ?? false;
}

export function setMorningRun(tenantId: string, on: boolean) {
  return tenantDb(tenantId).businessSettings.updateMany({ data: { jobSourcesMorning: on } });
}

// Takes the next switched-on source not yet checked today, so overlapping runs never check one twice.
// Marking it checked first means a run that is cut off mid-check doesn't retry it the same day.
export async function claimSourceForToday(tenantId: string, startOfToday: Date) {
  const db = tenantDb(tenantId);
  const notToday = { OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: startOfToday } }] };
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = await db.jobSource.findFirst({
      where: { enabled: true, ...notToday },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!next) return null;
    const claimed = await db.jobSource.updateMany({
      where: { id: next.id, ...notToday },
      data: { lastCheckedAt: new Date() },
    });
    if (claimed.count === 1) return next.id;
  }
  return null;
}

// The next job found by a source that is waiting to be read (oldest first)
export function nextWaitingSourceItem(tenantId: string, skip: string[]) {
  return tenantDb(tenantId).inboxItem.findFirst({
    where: { state: "READING", jobSourceId: { not: null }, id: { notIn: skip } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
}

// For the Dashboard: jobs from the sources waiting in Bulk post, found today, and sources in trouble
export async function sourcesDashboard(tenantId: string, startOfToday: Date) {
  const db = tenantDb(tenantId);
  const [toCheck, toRead, foundToday, troubled, morning, sources] = await Promise.all([
    db.inboxItem.count({ where: { jobSourceId: { not: null }, state: "CHECK" } }),
    db.inboxItem.count({ where: { jobSourceId: { not: null }, state: "READING" } }),
    db.inboxItem.count({ where: { jobSourceId: { not: null }, createdAt: { gte: startOfToday } } }),
    db.jobSource.findMany({
      where: {
        OR: [
          { enabled: false, failures: { gte: 3 } },
          { enabled: true, lastError: { not: null } },
        ],
      },
      select: { name: true, enabled: true },
    }),
    morningRunOn(tenantId),
    db.jobSource.count(),
  ]);
  return {
    toCheck,
    toRead,
    foundToday,
    stopped: troubled.filter((s) => !s.enabled).map((s) => s.name),
    problems: troubled.filter((s) => s.enabled).map((s) => s.name),
    morning,
    sources,
  };
}
