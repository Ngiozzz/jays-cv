"use server";

import { headers } from "next/headers";
import { checkCvFile, releaseCheckCv } from "@/modules/cv-check/cv-check.service";
import { orderFormToInput } from "@/modules/orders/place-order";
import { placeOrder, type PlaceOrderResult } from "@/modules/orders/place-order.service";
import { getRequestTenant } from "@/modules/tenants/tenants.service";

// The order card's last step: create the order with the client's details and CV
export async function placeOrderAction(form: FormData): Promise<PlaceOrderResult> {
  const tenant = await getRequestTenant();
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const uploaded = form.get("cv");
  const advert = form.get("advert");
  // Ordered straight after a CV check without choosing another file: the CV from the check
  const checkId = String(form.get("checkId") ?? "").slice(0, 64);
  const cv =
    uploaded instanceof File && uploaded.size > 0 ? uploaded : checkId ? await checkCvFile(tenant, checkId) : null;
  const result = await placeOrder(tenant, orderFormToInput(form), cv, ip, advert instanceof File ? advert : null);
  // The order has its own copy now
  if (result.ok && checkId) await releaseCheckCv(tenant, checkId);
  return result;
}
