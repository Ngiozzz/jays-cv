import type { IconName } from "@/components/icons/IconSprite";
import type { Permission } from "@/modules/team/permissions";

type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  // The sidebar heading it sits under (none: at the top, like the Dashboard)
  group?: NavGroup;
  // Hidden from people without this permission (the pages check it again on the server)
  permission?: Permission;
  // Build phase that delivers the screen; shown as "soon" until then
  phase?: number;
};

export const NAV_GROUPS = ["Orders", "Jobs board", "Website"] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/orders", label: "Orders", icon: "doc", group: "Orders", permission: "acceptOrders" },
  { href: "/admin/team", label: "Team", icon: "users", group: "Orders", permission: "manageTeam" },
  { href: "/admin/finance", label: "Finance", icon: "cash", group: "Orders", permission: "manageFinance" },
  { href: "/admin/ai", label: "AI", icon: "sparkle", group: "Orders", permission: "requestTokens" },
  { href: "/admin/jobs", label: "Job board", icon: "list", group: "Jobs board", permission: "postJobs" },
  { href: "/admin/inbox", label: "Bulk post", icon: "inbox", group: "Jobs board", permission: "postJobs" },
  { href: "/admin/jobs/new", label: "Post a job", icon: "plus", group: "Jobs board", permission: "postJobs" },
  {
    href: "/admin/job-sources",
    label: "Job sources",
    icon: "globe",
    group: "Jobs board",
    permission: "manageJobSources",
  },
  { href: "/admin/companies", label: "Company logos", icon: "building", group: "Jobs board", permission: "postJobs" },
  // Writers see it too, for Career tips (the only tab they get)
  { href: "/admin/content", label: "Website content", icon: "layout", group: "Website", permission: "draftCareerTips" },
];

// Pages that sit under another in the breadcrumb: the title the top bar shows, and the section they
// belong to (none for Your profile). Ones that are also in the menu highlight themselves there.
export const SUB_PAGES: Record<string, { title: string; under?: string }> = {
  "/admin/profile": { title: "Your profile" },
  "/admin/jobs/new": { title: "Post a job", under: "/admin/jobs" },
  "/admin/inbox": { title: "Bulk post jobs", under: "/admin/jobs" },
  "/admin/job-sources/found": { title: "Jobs found", under: "/admin/job-sources" },
};

// Website content tabs, as the breadcrumb and the tab bar name them
export const CONTENT_TAB_LABELS: Record<string, string> = {
  packages: "Packages & prices",
  reviews: "Reviews",
  samples: "Sample CVs",
  posts: "Career tips",
  faqs: "FAQs",
  home: "Homepage",
  about: "About page",
  settings: "Business settings",
};

export type AdminCrumb = { label: string; href: string };

// The breadcrumb above the page title: always from the Dashboard, then the section, then the page
// or item inside it, e.g. Dashboard › Job board › Post a job, or Dashboard › Orders › JC-1048
export function adminTrail(pathname: string, params: { get(name: string): string | null }): AdminCrumb[] {
  const trail: AdminCrumb[] = [{ label: "Dashboard", href: "/admin" }];
  if (pathname === "/admin") return trail;

  const sub = SUB_PAGES[pathname];
  const section =
    (sub?.under && ADMIN_NAV.find((item) => item.href === sub.under)) ||
    ADMIN_NAV.filter(
      (item) => item.href !== "/admin" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
    ).sort((a, b) => b.href.length - a.href.length)[0];
  if (section) trail.push({ label: section.label, href: section.href });
  if (sub) return [...trail, { label: sub.title, href: pathname }];
  if (!section) return trail;

  const rest = pathname.slice(section.href.length + 1);
  if (section.href === "/admin/jobs" && rest) trail.push({ label: "Edit job", href: pathname });
  if (section.href === "/admin/orders" && rest) trail.push({ label: decodeURIComponent(rest), href: pathname });
  const tab = params.get("tab");
  if (section.href === "/admin/content" && tab && CONTENT_TAB_LABELS[tab])
    trail.push({ label: CONTENT_TAB_LABELS[tab], href: `/admin/content?tab=${tab}` });
  return trail;
}
