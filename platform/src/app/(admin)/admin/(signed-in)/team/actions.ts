"use server";

import { refresh } from "next/cache";
import { requirePermission } from "@/modules/team/current-member";
import { inviteFormToInput, termsFormToInput } from "@/modules/team/team.schema";
import {
  cancelInvite,
  inviteMember,
  removeMember,
  setMemberPaused,
  updateMemberTerms,
} from "@/modules/team/team.service";

// Thin wrappers: the owner check, then the team service, then a fresh Team screen

export async function inviteMemberAction(form: FormData) {
  const member = await requirePermission("manageTeam");
  const result = await inviteMember(member, inviteFormToInput(form));
  if (result.ok) refresh();
  return result;
}

export async function updateMemberAction(membershipId: string, form: FormData) {
  const member = await requirePermission("manageTeam");
  const result = await updateMemberTerms(member, membershipId, termsFormToInput(form));
  if (result.ok) refresh();
  return result;
}

export async function setPausedAction(membershipId: string, paused: boolean) {
  const member = await requirePermission("manageTeam");
  const result = await setMemberPaused(member, membershipId, paused);
  refresh();
  return result;
}

export async function removeMemberAction(membershipId: string) {
  const member = await requirePermission("manageTeam");
  const result = await removeMember(member, membershipId);
  refresh();
  return result;
}

export async function cancelInviteAction(inviteId: string) {
  const member = await requirePermission("manageTeam");
  const result = await cancelInvite(member, inviteId);
  refresh();
  return result;
}
