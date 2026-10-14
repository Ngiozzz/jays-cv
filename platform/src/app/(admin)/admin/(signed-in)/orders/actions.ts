"use server";

import { refresh } from "next/cache";
import {
  acceptOrder,
  addNote,
  completeOrder,
  extendDeadline,
  logChanges,
  reassignOrder,
  recordPayment,
  sendDraft,
  type ActionResult,
} from "@/modules/orders/order-actions.service";
import { requireMember } from "@/modules/team/current-member";

// Thin wrappers: who's asking, then the order service; a successful step refreshes the page

async function done(result: ActionResult): Promise<ActionResult> {
  if (result.ok) refresh();
  return result;
}

export async function acceptOrderAction(orderId: string) {
  return done(await acceptOrder(await requireMember(), orderId));
}

export async function reassignOrderAction(orderId: string, writerId: string) {
  return done(await reassignOrder(await requireMember(), orderId, writerId));
}

export async function sendDraftAction(orderId: string, form: FormData) {
  const file = form.get("draft");
  const note = String(form.get("note") ?? "");
  return done(await sendDraft(await requireMember(), orderId, file instanceof File ? file : null, note));
}

export async function logChangesAction(orderId: string, form: FormData) {
  const member = await requireMember();
  return done(await logChanges(member, orderId, { text: form.get("text") ?? "", via: form.get("via") ?? "" }));
}

export async function completeOrderAction(orderId: string) {
  return done(await completeOrder(await requireMember(), orderId));
}

export async function extendDeadlineAction(orderId: string) {
  return done(await extendDeadline(await requireMember(), orderId, 24));
}

export async function recordPaymentAction(orderId: string, reference: string) {
  return done(await recordPayment(await requireMember(), orderId, reference));
}

export async function addNoteAction(orderId: string, text: string) {
  return done(await addNote(await requireMember(), orderId, text));
}
