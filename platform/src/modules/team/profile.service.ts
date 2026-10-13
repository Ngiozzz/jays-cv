import "server-only";
import type { CurrentMember } from "./current-member";
import { displayNameOf, profileSchema, splitName } from "./profile";
import { findMembership, updateMembership } from "./team.repo";

// Everyone can see and edit their own profile (names and phone number); the owner sets everything else
export async function loadProfile(member: CurrentMember) {
  const membership = await findMembership(member.tenant.id, member.userId);
  const names = membership?.firstName
    ? { firstName: membership.firstName, lastName: membership.lastName }
    : splitName(member.name);
  return {
    name: member.name,
    ...names,
    nickname: membership?.nickname ?? "",
    email: member.email,
    phone: membership?.phone ?? "",
    role: member.role,
    canWrite: member.canWrite,
    canPostJobs: member.canPostJobs,
    // Pay is money: only the owner sees it, on the Team page
    joinedAt: membership?.joinedAt.toISOString() ?? null,
    business: member.tenant.name,
  };
}

export type Profile = Awaited<ReturnType<typeof loadProfile>>;

export async function updateProfile(
  member: CurrentMember,
  raw: unknown,
): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
    };
  }
  await updateMembership(member.tenant.id, member.id, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    nickname: parsed.data.nickname,
    displayName: displayNameOf(parsed.data),
    phone: parsed.data.phone || null,
  });
  return { ok: true };
}
