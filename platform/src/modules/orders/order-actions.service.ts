import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { DOCUMENT_TYPES, fileStore } from "@/lib/storage";
import { tenantDb } from "@/lib/tenant-db";
import { findSettings } from "@/modules/content/content.repo";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan, can } from "@/modules/team/permissions";
import type { EventKind } from "./order-events";
import { MAX_FILE_NOTE } from "./order-files";
import { deleteAbandonedOrder, deleteAbandonedOrders } from "./order-upkeep.service";
import {
  acceptStep,
  completeStep,
  deleteStep,
  extendStep,
  payStep,
  reassignStep,
  requestChangesStep,
  sendDraftStep,
  type RuleOrder,
} from "./orders.rules";

// Admin → one order: what the team does to move it on. Each step re-checks on the server who may do
// it and whether the order is still where the person saw it, so two people can't both act at once.

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const refuse = (error: string): ActionResult => ({ ok: false, error });
const CHANGED = "This order changed meanwhile. Reload the page and try again.";
const TX = { maxWait: 10_000, timeout: 20_000 };
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Tx = Parameters<Parameters<ReturnType<typeof tenantDb>["$transaction"]>[0]>[0];

async function loadForAction(member: CurrentMember, orderId: string) {
  assertCan(member, "acceptOrders");
  return tenantDb(member.tenant.id).order.findFirst({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      status: true,
      amount: true,
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
      revisions: { orderBy: { round: "asc" }, select: { requestedAt: true } },
      files: { where: { kind: "DRAFT" }, select: { version: true } },
    },
  });
}

type ActionOrder = NonNullable<Awaited<ReturnType<typeof loadForAction>>>;
const rulesOf = (order: ActionOrder): RuleOrder => ({
  ...order,
  revisions: order.revisions.map((revision) => revision.requestedAt),
});
const worksOn = (member: CurrentMember, order: ActionOrder) =>
  can(member, "workOnAnyOrder") || order.writerId === member.id;

function event(
  tx: Tx,
  member: CurrentMember,
  orderId: string,
  kind: EventKind,
  data: Prisma.InputJsonValue | null,
  visibleToClient: boolean,
) {
  return tx.orderEvent.create({
    data: {
      tenantId: member.tenant.id,
      orderId,
      kind,
      actorType: "STAFF",
      actorId: member.id,
      data: data ?? Prisma.JsonNull,
      visibleToClient,
    },
  });
}

// Moves the order on only if it's still in the status the person saw
async function moveIf(
  tx: Tx,
  order: ActionOrder,
  data: Prisma.OrderUncheckedUpdateManyInput,
  also?: Prisma.OrderWhereInput,
) {
  const { count } = await tx.order.updateMany({ where: { id: order.id, status: order.status, ...also }, data });
  return count === 1;
}

async function run(member: CurrentMember, work: (tx: Tx) => Promise<boolean>, message: string): Promise<ActionResult> {
  const done = await tenantDb(member.tenant.id)
    .$transaction(async (tx) => {
      const moved = await work(tx);
      // Undo everything in this transaction if the order had moved on
      if (!moved) throw new StaleOrder();
      return true;
    }, TX)
    .catch((error: unknown) => {
      if (error instanceof StaleOrder) return false;
      throw error;
    });
  return done ? { ok: true, message } : refuse(CHANGED);
}

class StaleOrder extends Error {}

// ---------- Accept & reassign ----------

export async function acceptOrder(member: CurrentMember, orderId: string): Promise<ActionResult> {
  const order = await loadForAction(member, orderId);
  if (!order) return refuse("This order no longer exists.");
  const step = acceptStep(rulesOf(order), member.id, new Date());
  if (!step.ok) return refuse(step.error);
  // Only if nobody accepted it in the meantime: the first writer wins
  const result = await run(
    member,
    async (tx) =>
      (await moveIf(tx, order, step.change, { writerId: null })) &&
      !!(await event(tx, member, order.id, "accepted", null, true)),
    "You accepted this order. It's yours now.",
  );
  return result.ok ? result : refuse("Another writer accepted this order just before you.");
}

export async function reassignOrder(member: CurrentMember, orderId: string, writerId: string): Promise<ActionResult> {
  assertCan(member, "reassignOrders");
  const order = await loadForAction(member, orderId);
  if (!order) return refuse("This order no longer exists.");
  const target = await tenantDb(member.tenant.id).membership.findFirst({
    where: { id: writerId, status: "ACTIVE", OR: [{ role: "OWNER" }, { canWrite: true }] },
    select: { id: true, displayName: true },
  });
  if (!target) return refuse("Choose an active writer.");
  const step = reassignStep(rulesOf(order), target.id);
  if (!step.ok) return refuse(step.error);
  const data = { fromName: order.writer?.displayName ?? "nobody", toName: target.displayName };
  return run(
    member,
    async (tx) =>
      (await moveIf(tx, order, step.change, { writerId: order.writerId })) &&
      !!(await event(tx, member, order.id, "reassigned", data, true)),
    `Reassigned to ${target.displayName}.`,
  );
}

// ---------- Drafts, changes and completing ----------

const extensionOf = (name: string) => {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  return match ? match[1].toLowerCase() : "bin";
};

export function draftFileProblem(file: File | null): string | null {
  if (!file || file.size === 0) return "Choose the draft file first.";
  if (!DOCUMENT_TYPES.includes(file.type)) return "Upload a Word document, PDF or image.";
  if (file.size > MAX_FILE_BYTES) return "That file is over 10 MB.";
  return null;
}

export async function sendDraft(
  member: CurrentMember,
  orderId: string,
  file: File | null,
  message: string,
): Promise<ActionResult> {
  const order = await loadForAction(member, orderId);
  if (!order) return refuse("This order no longer exists.");
  if (!worksOn(member, order)) return refuse("Only the writer on this order or the owner can send drafts.");
  // First whether a draft can be sent now at all, then whether this file will do
  const step = sendDraftStep(rulesOf(order), true, new Date());
  if (!step.ok) return refuse(step.error);
  const problem = draftFileProblem(file);
  if (problem) return refuse(problem);
  const note = message.trim();
  if (note.length > MAX_FILE_NOTE) return refuse(`Keep the message under ${MAX_FILE_NOTE} characters.`);

  const version = Math.max(0, ...order.files.map((draft) => draft.version ?? 0)) + 1;
  const tenantId = member.tenant.id;
  const storagePath = `${tenantId}/${order.id}/draft-v${version}-${randomBytes(8).toString("hex")}.${extensionOf(file!.name)}`;
  await fileStore.put("order-files", storagePath, new Uint8Array(await file!.arrayBuffer()), file!.type);
  try {
    return await run(
      member,
      async (tx) => {
        if (!(await moveIf(tx, order, step.change))) return false;
        await tx.storedFile.create({
          data: {
            tenantId,
            orderId: order.id,
            kind: "DRAFT",
            version,
            name: file!.name.slice(0, 120),
            mimeType: file!.type,
            sizeBytes: file!.size,
            storagePath,
            note: note || null,
            uploadedBy: member.id,
          },
        });
        await event(tx, member, order.id, "draftSent", { version: `v${version}` }, true);
        return true;
      },
      `Draft v${version} sent. The client can open it on their tracking page.`,
    );
  } catch (error) {
    await fileStore.remove("order-files", storagePath).catch(() => {});
    throw error;
  }
}

const VIA = ["WhatsApp call", "WhatsApp chat", "Phone call", "Email"] as const;
export const changesSchema = z.object({
  text: z.string().trim().min(3, "Describe the changes needed.").max(1000, "Keep it under 1,000 characters."),
  via: z.enum(VIA),
});
export const CHANGE_CHANNELS = VIA;

export async function logChanges(member: CurrentMember, orderId: string, raw: unknown): Promise<ActionResult> {
  const order = await loadForAction(member, orderId);
  if (!order) return refuse("This order no longer exists.");
  if (!worksOn(member, order)) return refuse("Only the writer on this order or the owner can log changes.");
  const parsed = changesSchema.safeParse(raw);
  if (!parsed.success) return refuse(parsed.error.issues[0].message);
  const step = requestChangesStep(rulesOf(order), parsed.data.text, new Date());
  if (!step.ok) return refuse(step.error);
  const { round, text, ...change } = step.change;
  return run(
    member,
    async (tx) => {
      if (!(await moveIf(tx, order, change))) return false;
      await tx.orderRevision.create({
        data: {
          tenantId: member.tenant.id,
          orderId: order.id,
          round,
          requestedBy: `Client (${parsed.data.via})`,
          text,
        },
      });
      await event(tx, member, order.id, "changesRequested", { round, text, via: parsed.data.via }, true);
      return true;
    },
    "Moved to revisions. The revised draft's clock has started.",
  );
}

export async function completeOrder(member: CurrentMember, orderId: string): Promise<ActionResult> {
  const order = await loadForAction(member, orderId);
  if (!order) return refuse("This order no longer exists.");
  if (!worksOn(member, order)) return refuse("Only the writer on this order or the owner can complete it.");
  const step = completeStep(rulesOf(order), new Date());
  if (!step.ok) return refuse(step.error);
  return run(
    member,
    async (tx) =>
      (await moveIf(tx, order, step.change)) && !!(await event(tx, member, order.id, "completed", null, true)),
    "Order complete.",
  );
}

// ---------- Owner tools ----------

export async function extendDeadline(member: CurrentMember, orderId: string, hours: number): Promise<ActionResult> {
  assertCan(member, "reassignOrders");
  const order = await loadForAction(member, orderId);
  if (!order) return refuse("This order no longer exists.");
  const step = extendStep(rulesOf(order), hours, await findSettings(member.tenant.id));
  if (!step.ok) return refuse(step.error);
  return run(
    member,
    async (tx) =>
      (await moveIf(tx, order, step.change, { extraHours: order.extraHours })) &&
      !!(await event(tx, member, order.id, "extended", { hours }, false)),
    `Gave ${hours} more hours.`,
  );
}

// A payment that didn't arrive automatically (an M-Pesa code that didn't match, cash, bank…).
// One reference can only ever pay one order.
export const paymentRefSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,30}$/, "Enter the payment reference, e.g. the M-Pesa code.");

export async function recordPayment(member: CurrentMember, orderId: string, rawRef: string): Promise<ActionResult> {
  assertCan(member, "recordPayments");
  const order = await loadForAction(member, orderId);
  if (!order) return refuse("This order no longer exists.");
  const parsed = paymentRefSchema.safeParse(rawRef);
  if (!parsed.success) return refuse(parsed.error.issues[0].message);
  const receipt = parsed.data;
  const step = payStep(rulesOf(order), new Date());
  if (!step.ok) return refuse(step.error);

  const tenantId = member.tenant.id;
  const used = await tenantDb(tenantId).payment.findFirst({
    where: { receipt },
    select: { order: { select: { number: true } } },
  });
  if (used)
    return refuse(
      `That reference was already used${used.order ? ` for ${member.tenant.orderPrefix}-${used.order.number}` : ""}.`,
    );
  try {
    return await run(
      member,
      async (tx) => {
        if (!(await moveIf(tx, order, step.change))) return false;
        await tx.payment.create({
          data: {
            tenantId,
            orderId: order.id,
            channel: "MANUAL",
            status: "CONFIRMED",
            match: "MANUAL",
            amount: order.amount,
            receipt,
            accountReference: `${member.tenant.orderPrefix}-${order.number}`,
            recordedById: member.id,
            confirmedAt: step.change.paidAt,
          },
        });
        await event(tx, member, order.id, "paid", { amount: order.amount, receipt, manual: true }, true);
        return true;
      },
      "Payment recorded. The first-draft clock has started.",
    );
  } catch (error) {
    // Another order took this code in the same moment
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return refuse("That reference was already used for another order.");
    throw error;
  }
}

// ---------- Deleting unpaid orders (owner only) ----------

export async function deleteOrder(member: CurrentMember, orderId: string): Promise<ActionResult> {
  assertCan(member, "deleteOrders");
  const order = await tenantDb(member.tenant.id).order.findFirst({
    where: { id: orderId },
    select: { number: true, status: true, payments: { where: { status: "CONFIRMED" }, select: { amount: true } } },
  });
  if (!order) return refuse("This order no longer exists.");
  const step = deleteStep(
    order,
    order.payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  if (!step.ok) return refuse(step.error);
  if (!(await deleteAbandonedOrder(member.tenant.id, orderId))) return refuse(CHANGED);
  return { ok: true, message: `Deleted ${member.tenant.orderPrefix}-${order.number} and its files.` };
}

// Every abandoned order nobody paid for, whatever its age
export async function deleteAllAbandoned(member: CurrentMember): Promise<ActionResult> {
  assertCan(member, "deleteOrders");
  const deleted = await deleteAbandonedOrders(member.tenant.id, 0, new Date());
  if (!deleted) return refuse("There are no abandoned unpaid orders to delete.");
  return { ok: true, message: `Deleted ${deleted} abandoned ${deleted === 1 ? "order" : "orders"} and their files.` };
}

// ---------- Notes ----------

export async function addNote(member: CurrentMember, orderId: string, text: string): Promise<ActionResult> {
  const order = await loadForAction(member, orderId);
  if (!order) return refuse("This order no longer exists.");
  if (!worksOn(member, order)) return refuse("Only the writer on this order or the owner can add notes.");
  const note = text.trim();
  if (!note) return refuse("Write a note first.");
  if (note.length > 500) return refuse("Keep the note under 500 characters.");
  await tenantDb(member.tenant.id).$transaction(async (tx) => {
    await event(tx, member, order.id, "note", { text: note }, false);
  });
  return { ok: true, message: "Note added." };
}
