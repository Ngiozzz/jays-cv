"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { lookupOrder, type LookupResult } from "@/modules/orders/tracking.service";
import { getRequestTenant } from "@/modules/tenants/tenants.service";

// "Track my order": check the details, then open the order's tracking page
export async function lookupOrderAction(_previous: LookupResult | null, form: FormData): Promise<LookupResult> {
  const tenant = await getRequestTenant();
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const result = await lookupOrder(tenant, { order: form.get("order") ?? "", phone: form.get("phone") ?? "" }, ip);
  if (result.ok) redirect(`/track/${result.ref}`);
  return result;
}
