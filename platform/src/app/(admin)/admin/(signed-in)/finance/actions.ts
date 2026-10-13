"use server";

import { refresh } from "next/cache";
import { payoutFormToInput } from "@/modules/finance/finance.schema";
import { recordPayout, undoPayout } from "@/modules/finance/finance.service";
import { requirePermission } from "@/modules/team/current-member";

// Thin wrappers: the owner check, then the finance service, then a fresh Finance screen

export async function recordPayoutAction(writerId: string, form: FormData) {
  const member = await requirePermission("manageFinance");
  const result = await recordPayout(member, writerId, payoutFormToInput(form));
  if (result.ok) refresh();
  return result;
}

export async function undoPayoutAction(payoutId: string) {
  const member = await requirePermission("manageFinance");
  const result = await undoPayout(member, payoutId);
  refresh();
  return result;
}
