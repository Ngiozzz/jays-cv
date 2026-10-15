"use server";

import { headers } from "next/headers";
import { orderFormToInput } from "@/modules/orders/place-order";
import { placeOrder, type PlaceOrderResult } from "@/modules/orders/place-order.service";
import { getRequestTenant } from "@/modules/tenants/tenants.service";

// The order card's last step: create the order with the client's details and CV
export async function placeOrderAction(form: FormData): Promise<PlaceOrderResult> {
  const tenant = await getRequestTenant();
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const cv = form.get("cv");
  const advert = form.get("advert");
  return placeOrder(
    tenant,
    orderFormToInput(form),
    cv instanceof File ? cv : null,
    ip,
    advert instanceof File ? advert : null,
  );
}
