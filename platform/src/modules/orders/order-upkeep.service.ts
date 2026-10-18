import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { fileStore } from "@/lib/storage";
import { tenantDb } from "@/lib/tenant-db";
import { findSettings } from "@/modules/content/content.repo";
import { deleteOldCheckCvs } from "@/modules/cv-check/cv-check.service";
import { listTenantIds } from "@/modules/tenants/tenants.repo";
import type { EventKind } from "./order-events";
import {
  autoStepCutoffs,
  DAY,
  dueAutoSteps,
  filesCutoff,
  type AutoStep,
  type OrderTimings,
  type RuleOrder,
} from "./orders.rules";

// Order housekeeping: the automatic steps (abandon unpaid orders, flag drafts waiting for a reply,
// complete drafts nobody answered), deleting abandoned orders nobody paid for, and deleting the
// client's files once the business's "keep client files" time after delivery has passed.
// Runs nightly and whenever the team or the client opens orders, so statuses are never stale.

const TX = { maxWait: 10_000, timeout: 20_000 };

type Timings = OrderTimings & { deleteAbandonedDays: number; retentionMonths: number };

const RULE_FIELDS = {
  id: true,
  status: true,
  createdAt: true,
  paidAt: true,
  draftSentAt: true,
  remindedAt: true,
  writerId: true,
  firstDraftHours: true,
  extraHours: true,
  revisionRounds: true,
  revisionWindowDays: true,
  revisions: { orderBy: { round: "asc" }, select: { requestedAt: true } },
} as const;

// Applies every automatic step that's due (for one order, or the whole business)
export async function runAutoSteps(tenantId: string, timings: OrderTimings, now: Date, orderId?: string) {
  const db = tenantDb(tenantId);
  const { unpaidBefore, draftSentBefore } = autoStepCutoffs(timings, now);
  const due = await db.order.findMany({
    where: {
      ...(orderId ? { id: orderId } : {}),
      OR: [
        { status: "NEW", createdAt: { lte: unpaidBefore } },
        { status: "DRAFT_SENT", draftSentAt: { lte: draftSentBefore } },
      ],
    },
    select: RULE_FIELDS,
  });
  for (const order of due) {
    const rules: RuleOrder = { ...order, revisions: order.revisions.map((revision) => revision.requestedAt) };
    for (const step of dueAutoSteps(rules, timings, now)) await applyStep(tenantId, order.id, step, now);
  }
}

const STEP: Record<
  AutoStep,
  {
    where: Prisma.OrderWhereInput;
    data: (now: Date) => Prisma.OrderUpdateManyMutationInput;
    event: EventKind;
    client: boolean;
  }
> = {
  abandon: { where: { status: "NEW" }, data: () => ({ status: "ABANDONED" }), event: "abandoned", client: false },
  // The team sends the reminder (WhatsApp "Draft ready" message); the client isn't told one was sent
  remind: {
    where: { status: "DRAFT_SENT", remindedAt: null },
    data: (now) => ({ remindedAt: now }),
    event: "reminded",
    client: false,
  },
  autoComplete: {
    where: { status: "DRAFT_SENT" },
    data: (now) => ({ status: "DELIVERED", deliveredAt: now }),
    event: "autoCompleted",
    client: true,
  },
};

// Only if the order is still where the rules saw it, so two runs at once can't both apply a step
async function applyStep(tenantId: string, orderId: string, step: AutoStep, now: Date) {
  const { where, data, event, client } = STEP[step];
  await tenantDb(tenantId).$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: orderId, ...where }, data: data(now) });
    if (count === 1)
      await tx.orderEvent.create({
        data: { tenantId, orderId, kind: event, actorType: "SYSTEM", visibleToClient: client, at: now },
      });
  }, TX);
}

// ---------- Deleting abandoned orders ----------

class PaidMeanwhile extends Error {}

const NOTHING_PAID: Prisma.OrderWhereInput = { status: "ABANDONED", payments: { none: { status: "CONFIRMED" } } };

// Deletes one abandoned, unpaid order with its files. Keeps only its number and the hash of its
// tracking link, so the client's old link says "cancelled". False if it was paid meanwhile.
export async function deleteAbandonedOrder(tenantId: string, orderId: string): Promise<boolean> {
  const db = tenantDb(tenantId);
  const order = await db.order.findFirst({
    where: { id: orderId, ...NOTHING_PAID },
    select: { number: true, trackingTokenHash: true, files: { select: { storagePath: true } } },
  });
  if (!order) return false;
  const deleted = await db
    .$transaction(async (tx) => {
      // Unanswered or failed M-Pesa prompts go with the order; confirmed payments never do
      await tx.payment.deleteMany({ where: { orderId, status: { not: "CONFIRMED" } } });
      const { count } = await tx.order.deleteMany({ where: { id: orderId, ...NOTHING_PAID } });
      // Paid in the meantime: undo the prompt clean-up too
      if (count !== 1) throw new PaidMeanwhile();
      await tx.cancelledOrder.create({
        data: { tenantId, number: order.number, trackingTokenHash: order.trackingTokenHash },
      });
      return true;
    }, TX)
    .catch((error: unknown) => {
      if (error instanceof PaidMeanwhile) return false;
      throw error;
    });
  // The files go once the order is gone; a file left behind is only wasted space
  if (deleted) for (const file of order.files) await fileStore.remove("order-files", file.storagePath).catch(() => {});
  return deleted;
}

// Abandoned orders older than the business's setting (or every abandoned order, with 0 days)
export async function deleteAbandonedOrders(tenantId: string, olderThanDays: number, now: Date): Promise<number> {
  const old = await tenantDb(tenantId).order.findMany({
    where: { ...NOTHING_PAID, createdAt: { lte: new Date(now.getTime() - olderThanDays * DAY) } },
    select: { id: true },
  });
  let deleted = 0;
  for (const order of old) if (await deleteAbandonedOrder(tenantId, order.id)) deleted++;
  return deleted;
}

export async function countDeletableOrders(tenantId: string) {
  return tenantDb(tenantId).order.count({ where: NOTHING_PAID });
}

// ---------- Client files after delivery ----------

// The CV, drafts and final files of orders delivered longer ago than the setting. The order itself
// stays (Finance and reviews need it); its files are marked deleted, so the tracking page says so.
export async function deleteExpiredClientFiles(tenantId: string, retentionMonths: number, now: Date): Promise<number> {
  const cutoff = filesCutoff(now, retentionMonths);
  if (!cutoff) return 0;
  const db = tenantDb(tenantId);
  const files = await db.storedFile.findMany({
    where: { deletedAt: null, order: { status: "DELIVERED", deliveredAt: { lte: cutoff } } },
    select: { id: true, storagePath: true },
    take: 500,
  });
  for (const file of files) {
    // A file already missing from storage is fine: it's gone either way
    await fileStore.remove("order-files", file.storagePath).catch(() => {});
    await db.storedFile.updateMany({ where: { id: file.id }, data: { deletedAt: now } });
  }
  // The AI helper's notes describe the client's CV, so they go with the files
  await db.orderAiResult.deleteMany({ where: { order: { status: "DELIVERED", deliveredAt: { lte: cutoff } } } });
  return files.length;
}

// ---------- The nightly job ----------

export async function nightlyOrderUpkeep(now = new Date()) {
  const results = [];
  for (const tenant of await listTenantIds()) {
    const settings: Timings | null = await findSettings(tenant.id).catch(() => null);
    if (!settings) continue;
    await runAutoSteps(tenant.id, settings, now);
    const deleted = await deleteAbandonedOrders(tenant.id, settings.deleteAbandonedDays, now);
    const files = await deleteExpiredClientFiles(tenant.id, settings.retentionMonths, now);
    const checkCvs = await deleteOldCheckCvs(tenant.id, now);
    results.push({ tenant: tenant.slug, deleted, files, checkCvs });
  }
  return results;
}

// Before the team's order screens load: the automatic steps, and the business's auto-deletes
export async function upkeepBeforeTeamView(tenantId: string, settings: Timings, now: Date) {
  await runAutoSteps(tenantId, settings, now);
  await deleteAbandonedOrders(tenantId, settings.deleteAbandonedDays, now);
  await deleteExpiredClientFiles(tenantId, settings.retentionMonths, now);
}
