import "server-only";
import { tenantDb } from "@/lib/tenant-db";

// Reads for the client's tracking page. Only what the client may see is selected.

export function findOrderForLookup(tenantId: string, number: number) {
  return tenantDb(tenantId).order.findFirst({ where: { number }, select: { id: true, clientPhone: true } });
}

export function findOrderByTokenHash(tenantId: string, trackingTokenHash: string) {
  return tenantDb(tenantId).order.findFirst({ where: { trackingTokenHash }, select: { id: true, number: true } });
}

export function findOrderIdByNumber(tenantId: string, number: number) {
  return tenantDb(tenantId).order.findFirst({ where: { number }, select: { id: true } });
}

export function findTrackedOrder(tenantId: string, orderId: string) {
  return tenantDb(tenantId).order.findFirst({
    where: { id: orderId },
    select: {
      number: true,
      status: true,
      itemName: true,
      amount: true,
      clientName: true,
      createdAt: true,
      paidAt: true,
      draftSentAt: true,
      remindedAt: true,
      writerId: true,
      firstDraftHours: true,
      extraHours: true,
      revisionRounds: true,
      revisionWindowDays: true,
      writer: { select: { displayName: true } },
      revisions: { orderBy: { round: "asc" }, select: { requestedAt: true, text: true } },
      files: {
        where: { deletedAt: null },
        select: { id: true, kind: true, version: true, name: true, sizeBytes: true, note: true, createdAt: true },
      },
      events: {
        where: { visibleToClient: true },
        orderBy: { at: "desc" },
        select: { kind: true, actorType: true, data: true, at: true, actor: { select: { displayName: true } } },
      },
    },
  });
}

export type TrackedOrderRecord = NonNullable<Awaited<ReturnType<typeof findTrackedOrder>>>;

export function countWrongTries(tenantId: string, key: string, since: Date) {
  return tenantDb(tenantId).trackingAttempt.count({ where: { key, at: { gte: since } } });
}

export function recordWrongTry(tenantId: string, keys: string[]) {
  return tenantDb(tenantId).trackingAttempt.createMany({ data: keys.map((key) => ({ key, tenantId })) });
}

// Nightly clean-up: wrong tries only matter for an hour
export function deleteOldTries(tenantId: string, before: Date) {
  return tenantDb(tenantId).trackingAttempt.deleteMany({ where: { at: { lt: before } } });
}
