import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { getRequestTenant, type CurrentTenant } from "@/modules/tenants/tenants.service";
import { assertCan, type MemberAccess, type Permission } from "./permissions";
import { findMembership, touchLastSeen } from "./team.repo";

export type CurrentMember = MemberAccess & {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  tenant: CurrentTenant;
};

type Lookup = { member: CurrentMember } | { member: null; reason: "signed-out" | "no-access" };

// Read once per request (React cache), on the server, from the session cookie and the database.
// Paused or removed members are refused here on their very next request.
const lookupMember = cache(async (): Promise<Lookup> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { member: null, reason: "signed-out" };
  const tenant = await getRequestTenant();
  const membership = await findMembership(tenant.id, session.user.id);
  if (!membership || membership.status !== "ACTIVE") return { member: null, reason: "no-access" };
  await touchLastSeen(tenant.id, membership.id, new Date());
  return {
    member: {
      id: membership.id,
      userId: session.user.id,
      name: membership.displayName,
      email: membership.user.email,
      image: membership.user.image,
      role: membership.role,
      status: membership.status,
      canWrite: membership.canWrite,
      canPostJobs: membership.canPostJobs,
      tenant,
    },
  };
});

export async function requireMember(): Promise<CurrentMember> {
  const result = await lookupMember();
  if (result.member) return result.member;
  redirect(result.reason === "no-access" ? "/admin/login?error=no_access" : "/admin/login");
}

export async function requirePermission(permission: Permission): Promise<CurrentMember> {
  const member = await requireMember();
  assertCan(member, permission);
  return member;
}

// For the sign-in page: send people who are already signed in straight to the dashboard
export async function isSignedInMember(): Promise<boolean> {
  return Boolean((await lookupMember()).member);
}

// For routes that serve something other than a page (files): no redirect, just "who, if anyone"
export async function currentMemberOrNull(): Promise<CurrentMember | null> {
  return (await lookupMember()).member;
}
