import "server-only";
import { createHash } from "node:crypto";
import { findSettings } from "@/modules/content/content.repo";
import type { CurrentTenant } from "@/modules/tenants/tenants.service";
import { clientActor, clientEventText } from "./order-events";
import { groupFiles } from "./order-files";
import { autoCompleteAt, firstDraftDue, orderRef, revisionDue, roundsLabel, STATUS_TEXT } from "./orders.rules";
import {
  CLIENT_STEPS,
  greetingName,
  isLocked,
  lookupSchema,
  parseOrderNumber,
  samePhone,
  STEP_OF,
  TRY_LIMITS,
} from "./tracking";
import { grantTrackingPass, hasTrackingPass, trackingPassCookie } from "./tracking-pass";
import * as repo from "./tracking.repo";
import { hashTrackingToken, looksLikeTrackingToken } from "./tracking-token";

// The client's side of an order: finding it, and the tracking page.

export type LookupResult =
  { ok: true; ref: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const NOT_FOUND = "We couldn't find an order with those details. Check the order number and phone number.";
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
// The visitor's address is only kept as a hash, and only to count wrong tries
const visitorKey = (ip: string) => `visitor:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;

export async function lookupOrder(tenant: CurrentTenant, raw: unknown, ip: string): Promise<LookupResult> {
  const parsed = lookupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const visitor = visitorKey(ip);
  const { perOrder, perVisitor } = TRY_LIMITS;
  if (isLocked(await repo.countWrongTries(tenant.id, visitor, minutesAgo(perVisitor.minutes)), perVisitor))
    return { ok: false, error: "Too many tries. Please wait an hour, or ask us on WhatsApp." };

  const number = parseOrderNumber(parsed.data.order, tenant.orderPrefix);
  const orderKey = `order:${number ?? "invalid"}`;
  if (
    number !== null &&
    isLocked(await repo.countWrongTries(tenant.id, orderKey, minutesAgo(perOrder.minutes)), perOrder)
  )
    return {
      ok: false,
      error: `Too many tries for this order. Please wait ${perOrder.minutes} minutes, or ask us on WhatsApp.`,
    };

  const order = number === null ? null : await repo.findOrderForLookup(tenant.id, number);
  // The same answer whether the order doesn't exist or the phone is wrong, so numbers can't be probed
  if (!order || !samePhone(parsed.data.phone, order.clientPhone)) {
    await repo.recordWrongTry(tenant.id, number === null ? [visitor] : [visitor, orderKey]);
    return { ok: false, error: NOT_FOUND };
  }
  await grantTrackingPass(tenant.id, order.id);
  return { ok: true, ref: orderRef(tenant.orderPrefix, number!) };
}

// The private link sent to the client: /t/<code> lets them straight in, with the pass to keep
export async function openTrackingLink(tenant: CurrentTenant, token: string) {
  if (!looksLikeTrackingToken(token)) return null;
  const order = await repo.findOrderByTokenHash(tenant.id, hashTrackingToken(token));
  if (!order) return null;
  return { ref: orderRef(tenant.orderPrefix, order.number), pass: trackingPassCookie(tenant.id, order.id) };
}

// The tracking page for "JC-1048", if this browser holds a pass for it (null: ask for the details)
export async function loadTrackedOrder(tenant: CurrentTenant, ref: string) {
  const number = parseOrderNumber(ref, tenant.orderPrefix);
  const found = number === null ? null : await repo.findOrderIdByNumber(tenant.id, number);
  if (!found || !(await hasTrackingPass(tenant.id, found.id))) return null;
  const [order, settings] = await Promise.all([repo.findTrackedOrder(tenant.id, found.id), findSettings(tenant.id)]);
  if (!order) return null;

  const rules = { ...order, revisions: order.revisions.map((revision) => revision.requestedAt) };
  const timings = settings;
  return {
    ref: orderRef(tenant.orderPrefix, order.number),
    greeting: greetingName(order.clientName),
    itemName: order.itemName,
    amount: order.amount,
    status: order.status,
    statusText: STATUS_TEXT[order.status].client,
    statusTone: STATUS_TEXT[order.status].tone,
    steps: CLIENT_STEPS,
    step: STEP_OF[order.status],
    writer: order.writer ? greetingName(order.writer.displayName) : null,
    draftDue: firstDraftDue(rules)?.toISOString() ?? null,
    revisionDue: revisionDue(rules, timings)?.toISOString() ?? null,
    autoCompleteAt: autoCompleteAt(rules, timings)?.toISOString() ?? null,
    lastChange: order.revisions.at(-1)?.text ?? null,
    files: groupFiles(order.files),
    rounds: roundsLabel(rules),
    paybill: settings.paybill,
    whatsapp: settings.whatsapp,
    updates: order.events.flatMap((event) => {
      const view = { ...event, actorName: event.actor?.displayName ?? null };
      const text = clientEventText(view);
      return text ? [{ who: clientActor(view, tenant.name), text, at: event.at.toISOString() }] : [];
    }),
  };
}

export type TrackedOrder = NonNullable<Awaited<ReturnType<typeof loadTrackedOrder>>>;
