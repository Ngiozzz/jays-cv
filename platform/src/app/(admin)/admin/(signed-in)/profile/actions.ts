"use server";

import { refresh } from "next/cache";
import { requireMember } from "@/modules/team/current-member";
import { updateProfile } from "@/modules/team/profile.service";

export async function updateProfileAction(form: FormData) {
  const member = await requireMember();
  const result = await updateProfile(member, {
    displayName: String(form.get("displayName") ?? ""),
    phone: String(form.get("phone") ?? ""),
  });
  if (result.ok) refresh();
  return result;
}
