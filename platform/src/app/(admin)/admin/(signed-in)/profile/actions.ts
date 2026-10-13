"use server";

import { refresh } from "next/cache";
import { requireMember } from "@/modules/team/current-member";
import { updateProfile } from "@/modules/team/profile.service";

export async function updateProfileAction(form: FormData) {
  const member = await requireMember();
  const result = await updateProfile(member, {
    firstName: String(form.get("firstName") ?? ""),
    lastName: String(form.get("lastName") ?? ""),
    nickname: String(form.get("nickname") ?? ""),
    phone: String(form.get("phone") ?? ""),
  });
  if (result.ok) refresh();
  return result;
}
