import "server-only";
import { db } from "@/lib/db";
import { tenantDb } from "@/lib/tenant-db";

// Sign-in happens before we know which business the person works for, so the invite
// lookups below search every business by email. Everything else goes through tenantDb.

export function findPendingInvitesByEmail(email: string, now: Date) {
  return db.invite.findMany({
    where: { email, status: "PENDING", expiresAt: { gt: now } },
    orderBy: { createdAt: "asc" },
  });
}

export function countActiveMemberships(userId: string) {
  return db.membership.count({ where: { userId, status: "ACTIVE" } });
}

type AcceptedInvite = Awaited<ReturnType<typeof findPendingInvitesByEmail>>[number];

// Turns each invite into a membership in one transaction, so a half-accepted invite can't exist
export function acceptInvites(userId: string, invites: AcceptedInvite[], now: Date) {
  return db.$transaction(
    invites.flatMap((invite) => [
      db.membership.upsert({
        where: { tenantId_userId: { tenantId: invite.tenantId, userId } },
        // An earlier membership (e.g. removed, then re-invited) takes the new invite's terms
        update: membershipTerms(invite),
        create: { tenantId: invite.tenantId, userId, ...membershipTerms(invite) },
      }),
      db.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedAt: now } }),
    ]),
  );
}

function membershipTerms(invite: AcceptedInvite) {
  return {
    role: invite.role,
    status: "ACTIVE" as const,
    displayName: invite.name,
    phone: invite.phone,
    canWrite: invite.canWrite,
    canPostJobs: invite.canPostJobs,
    payPercent: invite.payPercent,
  };
}

export function findMembership(tenantId: string, userId: string) {
  return tenantDb(tenantId).membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: { user: { select: { email: true, image: true } } },
  });
}

export function touchLastSeen(tenantId: string, membershipId: string, now: Date) {
  return tenantDb(tenantId).membership.update({ where: { id: membershipId }, data: { lastSeenAt: now } });
}

export async function findUserEmail(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email ?? null;
}

// ---------- Team screen (always within one business) ----------

export function findTeamMembers(tenantId: string) {
  return tenantDb(tenantId).membership.findMany({
    where: { status: { not: "REMOVED" } },
    include: { user: { select: { email: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
}

export function findOpenInvites(tenantId: string) {
  return tenantDb(tenantId).invite.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
}

export function findMembershipById(tenantId: string, id: string) {
  return tenantDb(tenantId).membership.findUnique({ where: { id } });
}

export function findInviteById(tenantId: string, id: string) {
  return tenantDb(tenantId).invite.findUnique({ where: { id } });
}

// Someone already on the team, or already invited, with this email
export async function emailInUse(tenantId: string, email: string): Promise<boolean> {
  const [members, invites] = await Promise.all([
    tenantDb(tenantId).membership.count({ where: { status: { not: "REMOVED" }, user: { email } } }),
    tenantDb(tenantId).invite.count({ where: { status: "PENDING", email } }),
  ]);
  return members + invites > 0;
}

export function createInvite(
  tenantId: string,
  invite: {
    email: string;
    name: string;
    phone: string | null;
    canWrite: boolean;
    canPostJobs: boolean;
    payPercent: number;
    invitedById: string;
    expiresAt: Date;
  },
) {
  return tenantDb(tenantId).invite.create({ data: { ...invite, tenantId, role: "WRITER" } });
}

export function revokeInvite(tenantId: string, id: string) {
  return tenantDb(tenantId).invite.update({ where: { id }, data: { status: "REVOKED" } });
}

export function updateMembership(
  tenantId: string,
  id: string,
  data: {
    canWrite?: boolean;
    canPostJobs?: boolean;
    payPercent?: number;
    status?: "ACTIVE" | "PAUSED" | "REMOVED";
  },
) {
  return tenantDb(tenantId).membership.update({ where: { id }, data });
}
