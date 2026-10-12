import type { IconName } from "@/components/icons/IconSprite";
import type { Permission } from "@/modules/team/permissions";

type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  // Hidden from people without this permission (the pages check it again on the server)
  permission?: Permission;
  // Build phase that delivers the screen; shown as "soon" until then
  phase?: number;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/jobs", label: "Jobs", icon: "list", permission: "postJobs" },
  { href: "/admin/inbox", label: "Jobs inbox", icon: "inbox", permission: "postJobs" },
  { href: "/admin/jobs/new", label: "Post a job", icon: "plus", permission: "postJobs" },
  { href: "/admin/companies", label: "Company logos", icon: "building", permission: "postJobs" },
  { href: "/admin/orders", label: "Orders", icon: "cart", phase: 3 },
  { href: "/admin/team", label: "Team", icon: "users", permission: "manageTeam" },
  { href: "/admin/finance", label: "Finance", icon: "cash", permission: "manageFinance", phase: 4 },
  { href: "/admin/content", label: "Website content", icon: "layout", phase: 4 },
];
