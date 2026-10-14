"use server";

import { PRETEND_OUTCOMES, type PretendOutcome } from "@/modules/payments/mpesa";
import {
  checkPaymentPrompt,
  pretendPhoneAnswer,
  sendPaymentPrompt,
  showPaybillAccount,
} from "@/modules/payments/payments.service";
import { getRequestTenant } from "@/modules/tenants/tenants.service";

// The pay box on the order confirmation and the tracking page. Thin wrappers: the payments service
// checks that this browser holds the order's tracking pass.

export async function sendPromptAction(ref: string, phone: string) {
  return sendPaymentPrompt(await getRequestTenant(), String(ref), String(phone));
}

export async function checkPromptAction(ref: string, paymentId: string) {
  return checkPaymentPrompt(await getRequestTenant(), String(ref), String(paymentId));
}

export async function pretendAnswerAction(ref: string, paymentId: string, outcome: PretendOutcome) {
  if (!PRETEND_OUTCOMES.includes(outcome)) return { ok: false as const, error: "Unknown answer." };
  return pretendPhoneAnswer(await getRequestTenant(), String(ref), String(paymentId), outcome);
}

export async function showAccountAction(ref: string) {
  return showPaybillAccount(await getRequestTenant(), String(ref));
}
