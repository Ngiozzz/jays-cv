"use server";

import { refresh } from "next/cache";
import { setAiAllowance, setAiEnabled, setPoolFallback } from "@/modules/ai/tokens.service";
import { requirePermission } from "@/modules/team/current-member";

// Thin wrappers: the owner check, then the tokens service, then a fresh AI page

export async function setAllowanceAction(membershipId: string, form: FormData) {
  const member = await requirePermission("requestTokens");
  const result = await setAiAllowance(member, membershipId, form.get("allowance"));
  if (result.ok) refresh();
  return result;
}

export async function setAiEnabledAction(membershipId: string, enabled: boolean) {
  const member = await requirePermission("requestTokens");
  const result = await setAiEnabled(member, membershipId, enabled);
  refresh();
  return result;
}

export async function setPoolFallbackAction(on: boolean) {
  const member = await requirePermission("requestTokens");
  const result = await setPoolFallback(member, on);
  refresh();
  return result;
}
