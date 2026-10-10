import { Suspense, type ReactNode } from "react";
import { AdminFrame, type FrameNavItem } from "@/components/admin/AdminFrame";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { can } from "@/modules/team/permissions";
import { requireMember, type CurrentMember } from "@/modules/team/current-member";

// Everything here needs a signed-in, active team member. The session is read at request time,
// so the shell streams in behind Suspense; each page also checks access itself.
export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin">
      <Suspense fallback={<p className="admin-loading">Loading…</p>}>
        <Shell>{children}</Shell>
      </Suspense>
    </div>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  const member = await requireMember();
  return (
    <AdminFrame nav={visibleNav(member)} user={frameUser(member)}>
      {children}
    </AdminFrame>
  );
}

function visibleNav(member: CurrentMember): FrameNavItem[] {
  return ADMIN_NAV.filter((item) => !item.permission || can(member, item.permission)).map(
    ({ href, label, icon, phase }) => ({ href, label, icon, phase }),
  );
}

function frameUser(member: CurrentMember) {
  const initials = member.name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { name: member.name, roleLabel: member.role === "OWNER" ? "Owner" : "Writer", initials };
}
