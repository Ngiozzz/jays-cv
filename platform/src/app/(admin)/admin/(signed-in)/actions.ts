"use server";

import { refresh } from "next/cache";
import { tokenRequestFormToInput } from "@/modules/ai/token-requests";
import { cancelTokenRequest, requestTokens } from "@/modules/ai/token-requests.service";
import { requireMember, requirePermission } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

// Thin wrappers: the owner check, then the token request service, then a fresh Dashboard

export async function requestTokensAction(form: FormData) {
  const member = await requireMember();
  if (!can(member, "requestTokens")) {
    return { ok: false as const, fieldErrors: { form: "Only the business owner can ask for more tokens." } };
  }
  const result = await requestTokens(member, tokenRequestFormToInput(form));
  if (result.ok) refresh();
  return result;
}

export async function cancelTokenRequestAction(requestId: string) {
  const member = await requirePermission("requestTokens");
  const result = await cancelTokenRequest(member, requestId);
  refresh();
  return result;
}
