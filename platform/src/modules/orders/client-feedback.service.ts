import "server-only";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { fileStore } from "@/lib/storage";
import { tenantDb } from "@/lib/tenant-db";
import { screenReview } from "@/modules/ai/claude";
import { aiStopped } from "@/modules/ai/tokens";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import type { CurrentTenant } from "@/modules/tenants/tenants.service";
import { changeRequestSchema, changesFileProblem, clientRounds, reviewSchema } from "./client-feedback";
import type { EventKind } from "./order-events";
import { completeStep, requestChangesStep, type RuleOrder } from "./orders.rules";
import { parseOrderNumber } from "./tracking";
import { hasTrackingPass } from "./tracking-pass";

// The client acting on their order from the tracking page: asking for changes, approving the draft,
// and leaving a review. Only a browser holding the order's tracking pass may do these.

export type ClientResult =
  { ok: true; message: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const refuse = (error: string, fieldErrors?: Record<string, string>): ClientResult => ({
  ok: false,
  error,
  fieldErrors,
});
const NOT_YOURS = "We couldn't find this order in your browser. Open your tracking link and try again.";
const CHANGED = "Your order changed meanwhile. Reload the page to see where it is.";
const TX = { maxWait: 10_000, timeout: 20_000 };

async function clientOrder(tenant: CurrentTenant, ref: string) {
  const number = parseOrderNumber(ref, tenant.orderPrefix);
  if (number === null) return null;
  const order = await tenantDb(tenant.id).order.findFirst({
    where: { number },
    select: {
      id: true,
      number: true,
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
    },
  });
  if (!order || !(await hasTrackingPass(tenant.id, order.id))) return null;
  return order;
}

type ClientOrder = NonNullable<Awaited<ReturnType<typeof clientOrder>>>;
type Tx = Parameters<Parameters<ReturnType<typeof tenantDb>["$transaction"]>[0]>[0];

const rulesOf = (order: ClientOrder): RuleOrder => ({
  ...order,
  revisions: order.revisions.map((revision) => revision.requestedAt),
});

const clientEvent = (tx: Tx, tenantId: string, orderId: string, kind: EventKind, data?: Prisma.InputJsonValue) =>
  tx.orderEvent.create({
    data: { tenantId, orderId, kind, actorType: "CLIENT", data: data ?? Prisma.JsonNull, visibleToClient: true },
  });

class Stale extends Error {}

// Runs the work in one transaction; false if the order had moved on (nothing is saved then)
async function inTx(tenantId: string, work: (tx: Tx) => Promise<boolean>) {
  return tenantDb(tenantId)
    .$transaction(async (tx) => {
      if (!(await work(tx))) throw new Stale();
      return true;
    }, TX)
    .catch((error: unknown) => {
      if (error instanceof Stale) return false;
      throw error;
    });
}

const extensionOf = (name: string) => /\.([a-z0-9]{1,5})$/i.exec(name)?.[1].toLowerCase() ?? "bin";

// ---------- Ask for changes ----------

export async function requestChangesByClient(
  tenant: CurrentTenant,
  ref: string,
  rawText: string,
  file: File | null,
): Promise<ClientResult> {
  const order = await clientOrder(tenant, ref);
  if (!order) return refuse(NOT_YOURS);
  const now = new Date();
  const rounds = clientRounds(rulesOf(order), now);
  if (!rounds.canAsk) return refuse(`${rounds.reason} Message us on WhatsApp if you need more changes.`);
  const parsed = changeRequestSchema.safeParse({ text: rawText });
  if (!parsed.success) return refuse(parsed.error.issues[0].message, { text: parsed.error.issues[0].message });
  const attached = file && file.size > 0 ? file : null;
  const problem = changesFileProblem(attached);
  if (problem) return refuse(problem, { file: problem });
  const step = requestChangesStep(rulesOf(order), parsed.data.text, now);
  if (!step.ok) return refuse(CHANGED);

  const { round, text, ...change } = step.change;
  const storagePath = attached
    ? `${tenant.id}/${order.id}/changes-r${round}-${randomBytes(6).toString("hex")}.${extensionOf(attached.name)}`
    : null;
  if (attached && storagePath)
    await fileStore.put("order-files", storagePath, new Uint8Array(await attached.arrayBuffer()), attached.type);
  try {
    const saved = await inTx(tenant.id, async (tx) => {
      const { count } = await tx.order.updateMany({ where: { id: order.id, status: "DRAFT_SENT" }, data: change });
      if (count !== 1) return false;
      await tx.orderRevision.create({
        data: { tenantId: tenant.id, orderId: order.id, round, requestedBy: "Client (tracking page)", text },
      });
      if (attached && storagePath)
        await tx.storedFile.create({
          data: {
            tenantId: tenant.id,
            orderId: order.id,
            kind: "CHANGES",
            name: attached.name.slice(0, 120),
            mimeType: attached.type,
            sizeBytes: attached.size,
            storagePath,
            note: `Sent with the change request (round ${round})`,
            uploadedBy: "client",
          },
        });
      await clientEvent(tx, tenant.id, order.id, "changesRequested", {
        round,
        text,
        ...(attached ? { file: attached.name.slice(0, 120) } : {}),
      });
      return true;
    });
    if (!saved) {
      if (storagePath) await fileStore.remove("order-files", storagePath).catch(() => {});
      return refuse(CHANGED);
    }
  } catch (error) {
    if (storagePath) await fileStore.remove("order-files", storagePath).catch(() => {});
    throw error;
  }
  return { ok: true, message: "Sent to your writer. We'll let you know when your revised draft is ready." };
}

// ---------- "I'm happy with it" ----------

export async function approveDraftByClient(tenant: CurrentTenant, ref: string): Promise<ClientResult> {
  const order = await clientOrder(tenant, ref);
  if (!order) return refuse(NOT_YOURS);
  const step = completeStep(rulesOf(order), new Date());
  if (!step.ok) return refuse(CHANGED);
  const saved = await inTx(tenant.id, async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: order.id, status: "DRAFT_SENT" }, data: step.change });
    return count === 1 && !!(await clientEvent(tx, tenant.id, order.id, "completed"));
  });
  return saved ? { ok: true, message: "Your order is complete. Thank you!" } : refuse(CHANGED);
}

// ---------- The review ----------

export async function leaveReview(tenant: CurrentTenant, ref: string, raw: unknown): Promise<ClientResult> {
  const order = await clientOrder(tenant, ref);
  if (!order) return refuse(NOT_YOURS);
  if (order.status !== "DELIVERED") return refuse("You can leave a review once your order is complete.");
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return refuse("Please check the highlighted fields.", fieldErrors);
  }
  const review = parsed.data;
  let reviewId = "";
  try {
    await tenantDb(tenant.id).$transaction(async (tx) => {
      ({ id: reviewId } = await tx.review.create({
        data: {
          tenantId: tenant.id,
          orderId: order.id,
          name: review.name,
          role: review.role,
          rating: review.rating,
          text: review.text,
          consent: review.consent,
          // Nothing reaches the website until the owner approves it
          status: "PENDING",
          source: `Order ${tenant.orderPrefix}-${order.number}`,
        },
        select: { id: true },
      }));
      await clientEvent(tx, tenant.id, order.id, "reviewed", { rating: review.rating });
    }, TX);
  } catch (error) {
    // One review per order
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return refuse("You've already sent a review for this order. Thank you!");
    throw error;
  }
  // The AI screens it for the owner once the client has their answer, so they don't wait for it
  after(() => screenNewReview(tenant.id, order.id, reviewId, review));
  return { ok: true, message: "Thank you for your review!" };
}

// "✓ Looks genuine" or "⚠ Check this: …" beside the waiting review in Website content → Reviews.
// Best effort: without tokens or the AI, the review simply waits without a note.
async function screenNewReview(
  tenantId: string,
  orderId: string,
  reviewId: string,
  review: { rating: number; name: string; role: string | null; text: string },
) {
  try {
    if (aiStopped(await getTokenBalance(tenantId))) return;
    const screened = await screenReview({ ...review, role: review.role ?? "" });
    if (!screened) return;
    if (screened.usage) {
      await recordUsage(tenantId, { feature: "Review screening", memberId: null, orderId, ...screened.usage });
    }
    await tenantDb(tenantId).review.updateMany({
      where: { id: reviewId },
      data: { aiFlag: screened.data.verdict, aiReason: screened.data.reason.slice(0, 500) },
    });
  } catch (error) {
    console.error("[ai] review screening failed", error);
  }
}
