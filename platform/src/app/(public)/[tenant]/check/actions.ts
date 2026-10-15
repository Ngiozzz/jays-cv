"use server";

import { followCvCheck, pretendCheckPayment, startCvCheck } from "@/modules/cv-check/cv-check.service";
import { PRETEND_OUTCOMES, type PretendOutcome } from "@/modules/payments/mpesa";
import { getRequestTenant } from "@/modules/tenants/tenants.service";

// "Check it yourself" on a job page. Thin wrappers: the service checks this browser's pass for the check.

export async function startCvCheckAction(form: FormData) {
  const cv = form.get("cv");
  return startCvCheck(
    await getRequestTenant(),
    String(form.get("jobSlug") ?? ""),
    String(form.get("phone") ?? ""),
    cv instanceof File ? cv : null,
  );
}

export async function followCvCheckAction(checkId: string, paymentId: string) {
  return followCvCheck(await getRequestTenant(), String(checkId), String(paymentId));
}

export async function pretendCheckPaymentAction(checkId: string, paymentId: string, outcome: PretendOutcome) {
  if (!PRETEND_OUTCOMES.includes(outcome)) return { ok: false as const, error: "Unknown answer." };
  return pretendCheckPayment(await getRequestTenant(), String(checkId), String(paymentId), outcome);
}
