import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { tenantDb } from "@/lib/tenant-db";

const DAY_MS = 86_400_000;

// What the inbox screen shows: everything waiting, plus the last week's decisions
export function findInboxItems(tenantId: string, now: Date) {
  return tenantDb(tenantId).inboxItem.findMany({
    where: {
      OR: [{ state: { in: ["READING", "CHECK"] } }, { decidedAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } }],
    },
    orderBy: { createdAt: "asc" },
    include: { job: { select: { slug: true } } },
  });
}

export type InboxRow = Awaited<ReturnType<typeof findInboxItems>>[number];

export function findInboxItem(tenantId: string, id: string) {
  return tenantDb(tenantId).inboxItem.findUnique({ where: { id } });
}

export function createInboxItem(tenantId: string, data: Omit<Prisma.InboxItemUncheckedCreateInput, "tenantId">) {
  return tenantDb(tenantId).inboxItem.create({ data: { ...data, tenantId } });
}

export function updateInboxItem(tenantId: string, id: string, data: Prisma.InboxItemUncheckedUpdateInput) {
  return tenantDb(tenantId).inboxItem.update({ where: { id }, data });
}

// Moves a poster from READING to "being read" only once, so two browsers never pay to read the same poster
export async function claimForReading(tenantId: string, id: string): Promise<boolean> {
  const result = await tenantDb(tenantId).inboxItem.updateMany({
    // A claim left by a browser that closed mid-read is taken over after two minutes
    where: { id, state: "READING", OR: [{ readAt: null }, { readAt: { lt: new Date(Date.now() - 120_000) } }] },
    data: { readAt: new Date() },
  });
  return result.count === 1;
}

// Discarded posters older than a week: their images are deleted by the nightly clean-up
export function findOldDiscarded(tenantId: string, before: Date) {
  return tenantDb(tenantId).inboxItem.findMany({
    where: { state: "DISCARDED", decidedAt: { lt: before } },
    select: { id: true, posterPath: true },
  });
}

// Jobs split off a poster that nobody has dealt with yet (replaced when the poster is read again)
export async function takeUndecidedSplits(tenantId: string, splitFromId: string) {
  const db = tenantDb(tenantId);
  const splits = await db.inboxItem.findMany({
    where: { splitFromId, state: { in: ["READING", "CHECK"] } },
    select: { id: true, posterPath: true },
  });
  if (splits.length) await db.inboxItem.deleteMany({ where: { id: { in: splits.map((s) => s.id) } } });
  return splits;
}

export function deleteInboxItems(tenantId: string, ids: string[]) {
  return tenantDb(tenantId).inboxItem.deleteMany({ where: { id: { in: ids } } });
}
