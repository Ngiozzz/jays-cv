"use server";

import { refresh } from "next/cache";
import { reviewFormToInput } from "@/modules/orders/client-feedback";
import {
  approveDraftByClient,
  leaveReview,
  requestChangesByClient,
  type ClientResult,
} from "@/modules/orders/client-feedback.service";
import { getRequestTenant } from "@/modules/tenants/tenants.service";

// The client's answers to a draft on the tracking page, and their review. Thin wrappers: the service
// checks that this browser holds the order's tracking pass. A success reloads the page's order.

function done(result: ClientResult): ClientResult {
  if (result.ok) refresh();
  return result;
}

export async function requestChangesAction(ref: string, form: FormData) {
  const file = form.get("file");
  return done(
    await requestChangesByClient(
      await getRequestTenant(),
      String(ref),
      String(form.get("text") ?? ""),
      file instanceof File ? file : null,
    ),
  );
}

export async function approveDraftAction(ref: string) {
  return done(await approveDraftByClient(await getRequestTenant(), String(ref)));
}

export async function leaveReviewAction(ref: string, form: FormData) {
  return done(await leaveReview(await getRequestTenant(), String(ref), reviewFormToInput(form)));
}
