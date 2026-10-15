"use server";

import { refresh } from "next/cache";
import {
  acceptOrder,
  addNote,
  completeOrder,
  deleteAllAbandoned,
  deleteOrder,
  extendDeadline,
  logChanges,
  reassignOrder,
  recordPayment,
  sendDraft,
  type ActionResult,
} from "@/modules/orders/order-actions.service";
import { WRITER_TOOLS, type WriterTool } from "@/modules/ai/writer-tools";
import { runWriterTool, type AiHelperOutcome } from "@/modules/orders/ai-helper.service";
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

// The page is gone afterwards, so the button takes the owner back to the list instead of refreshing
export async function deleteOrderAction(orderId: string) {
  return deleteOrder(await requireMember(), orderId);
}

export async function deleteAllAbandonedAction() {
  return done(await deleteAllAbandoned(await requireMember()));
}

export async function addNoteAction(orderId: string, text: string) {
  return done(await addNote(await requireMember(), orderId, text));
}

// The writer's AI helper: the result shows in place, so the page isn't refreshed
export async function runWriterToolAction(orderId: string, tool: WriterTool, form: FormData): Promise<AiHelperOutcome> {
  if (!WRITER_TOOLS.includes(tool)) return { ok: false, error: "Unknown AI tool." };
  const file = form.get("file");
  return runWriterTool(await requireMember(), orderId, tool, file instanceof File && file.size > 0 ? file : null);
}
