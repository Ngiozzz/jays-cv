import type { MemberStatus, Role } from "@/generated/prisma/enums";

// What a signed-in team member may do. Checked on the server for every action;
// hiding a button is never the only protection.
export type Permission =
  | "seeMoney"
  | "manageTeam"
  | "manageFinance"
  | "editWebsiteContent"
  | "draftCareerTips"
  | "recordPayments"
  | "reassignOrders"
  | "deleteOrders"
  | "workOnAnyOrder"
  | "acceptOrders"
  | "postJobs";

export type MemberAccess = {
  role: Role;
  status: MemberStatus;
  canWrite: boolean;
  canPostJobs: boolean;
};

// The owner holds every rein: money, team, website content, any order
const WRITER_PERMISSIONS: Record<Permission, (m: MemberAccess) => boolean> = {
  seeMoney: () => false,
  manageTeam: () => false,
  manageFinance: () => false,
  editWebsiteContent: () => false,
  draftCareerTips: () => true,
  recordPayments: () => false,
  reassignOrders: () => false,
  deleteOrders: () => false,
  workOnAnyOrder: () => false,
  acceptOrders: (m) => m.canWrite,
  postJobs: (m) => m.canPostJobs,
};

export function can(member: MemberAccess, permission: Permission): boolean {
  if (member.status !== "ACTIVE") return false;
  if (member.role === "OWNER") return true;
  return WRITER_PERMISSIONS[permission](member);
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Not allowed: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(member: MemberAccess, permission: Permission): void {
  if (!can(member, permission)) throw new ForbiddenError(permission);
}
