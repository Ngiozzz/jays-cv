import "server-only";
import { env } from "@/lib/env";
import type { CurrentMember } from "./current-member";
import { inviteExpiry } from "./invites";
import { assertCan } from "./permissions";
import * as repo from "./team.repo";
import { canChangeMember, inviteMessage } from "./team.rules";
import { inviteSchema, memberTermsSchema } from "./team.schema";

// The Team screen: only the owner may use any of this (checked here, on the server)

export type FieldErrors = Record<string, string>;
type Result = { ok: true } | { ok: false; error: string };

const signInUrl = () => `${env.APP_URL}/admin/login`;

export type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phone: string | null;
  role: "OWNER" | "WRITER";
  status: "ACTIVE" | "PAUSED";
  canWrite: boolean;
  canPostJobs: boolean;
  payPercent: number;
  joinedAt: string;
  lastSeenAt: string | null;
  changeable: boolean;
};

export type TeamInviteRow = {
  id: string;
  // The owner's own invite (made when the business is set up) can't be cancelled here
  owner: boolean;
  name: string;
  email: string;
  phone: string | null;
  canWrite: boolean;
  canPostJobs: boolean;
  payPercent: number;
  invitedAt: string;
  expired: boolean;
  message: string;
};

export async function loadTeam(member: CurrentMember) {
  assertCan(member, "manageTeam");
  const tenantId = member.tenant.id;
  const [memberships, invites] = await Promise.all([repo.findTeamMembers(tenantId), repo.findOpenInvites(tenantId)]);
  const now = new Date();

  const members: TeamMemberRow[] = memberships.map((m) => ({
    id: m.id,
    name: m.displayName,
    email: m.user.email,
    image: m.user.image,
    phone: m.phone,
    role: m.role,
    status: m.status === "PAUSED" ? "PAUSED" : "ACTIVE",
    canWrite: m.canWrite,
    canPostJobs: m.canPostJobs,
    payPercent: m.payPercent,
    joinedAt: m.joinedAt.toISOString(),
    lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
    changeable: canChangeMember(member, m),
  }));
  const pending: TeamInviteRow[] = invites.map((invite) => ({
    id: invite.id,
    owner: invite.role === "OWNER",
    name: invite.name,
    email: invite.email,
    phone: invite.phone,
    canWrite: invite.canWrite,
    canPostJobs: invite.canPostJobs,
    payPercent: invite.payPercent,
    invitedAt: invite.createdAt.toISOString(),
    expired: invite.expiresAt <= now,
    message: inviteMessage(invite, signInUrl(), member.tenant.name),
  }));
  return { members, invites: pending };
}

export type TeamData = Awaited<ReturnType<typeof loadTeam>>;

export async function inviteMember(
  member: CurrentMember,
  raw: unknown,
): Promise<{ ok: true; invite: TeamInviteRow } | { ok: false; fieldErrors: FieldErrors }> {
  assertCan(member, "manageTeam");
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
    };
  }
  const tenantId = member.tenant.id;
  if (await repo.emailInUse(tenantId, parsed.data.email)) {
    return { ok: false, fieldErrors: { email: "Someone with this email is already on the team or invited." } };
  }
  const now = new Date();
  const invite = await repo.createInvite(tenantId, {
    ...parsed.data,
    phone: parsed.data.phone || null,
    invitedById: member.id,
    expiresAt: inviteExpiry(now),
  });
  return {
    ok: true,
    invite: {
      id: invite.id,
      owner: false,
      name: invite.name,
      email: invite.email,
      phone: invite.phone,
      canWrite: invite.canWrite,
      canPostJobs: invite.canPostJobs,
      payPercent: invite.payPercent,
      invitedAt: invite.createdAt.toISOString(),
      expired: false,
      message: inviteMessage(invite, signInUrl(), member.tenant.name),
    },
  };
}

async function changeable(member: CurrentMember, membershipId: string) {
  assertCan(member, "manageTeam");
  const target = await repo.findMembershipById(member.tenant.id, membershipId);
  if (!target || target.status === "REMOVED") return null;
  return canChangeMember(member, target) ? target : null;
}

export async function updateMemberTerms(
  member: CurrentMember,
  membershipId: string,
  raw: unknown,
): Promise<{ ok: true } | { ok: false; fieldErrors: FieldErrors }> {
  const target = await changeable(member, membershipId);
  if (!target) return { ok: false, fieldErrors: { form: "This person can't be changed here." } };
  const parsed = memberTermsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: { payPercent: parsed.error.issues[0].message } };
  await repo.updateMembership(member.tenant.id, target.id, parsed.data);
  return { ok: true };
}

// Pausing takes effect on the person's very next click: every admin request re-checks their status
export async function setMemberPaused(member: CurrentMember, membershipId: string, paused: boolean): Promise<Result> {
  const target = await changeable(member, membershipId);
  if (!target) return { ok: false, error: "This person can't be changed here." };
  await repo.updateMembership(member.tenant.id, target.id, { status: paused ? "PAUSED" : "ACTIVE" });
  return { ok: true };
}

// Removed members keep their history (who wrote which CV), but can no longer sign in to this business
export async function removeMember(member: CurrentMember, membershipId: string): Promise<Result> {
  const target = await changeable(member, membershipId);
  if (!target) return { ok: false, error: "This person can't be removed." };
  await repo.updateMembership(member.tenant.id, target.id, { status: "REMOVED" });
  return { ok: true };
}

export async function cancelInvite(member: CurrentMember, inviteId: string): Promise<Result> {
  assertCan(member, "manageTeam");
  const invite = await repo.findInviteById(member.tenant.id, inviteId);
  if (!invite || invite.status !== "PENDING")
    return { ok: false, error: "This invite has already been used or cancelled." };
  if (invite.role === "OWNER") return { ok: false, error: "The owner's invite can't be cancelled." };
  await repo.revokeInvite(member.tenant.id, invite.id);
  return { ok: true };
}
