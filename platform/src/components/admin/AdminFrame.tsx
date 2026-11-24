"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { TokensAccessProvider } from "./AskForTokens";
import { Avatar } from "./Avatar";
import { SignOutButton } from "./SignOutButton";
import { adminTrail, NAV_GROUPS, SUB_PAGES, type NavGroup } from "./admin-nav";

export type FrameNavItem = { href: string; label: string; icon: IconName; group?: NavGroup; phase?: number };
export type FrameUser = { name: string; roleLabel: string; initials: string; image: string | null };

type Props = { nav: FrameNavItem[]; user: FrameUser; canRequestTokens: boolean; children: ReactNode };

// The admin shell: a quiet sidebar grouped by Orders, Jobs board and Website, with who is signed in
// at the foot; above each screen the breadcrumb and its title.
export function AdminFrame({ nav, user, canRequestTokens, children }: Props) {
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);
  const sub = SUB_PAGES[pathname];
  const current = currentItem(nav, pathname) ?? (sub?.under ? nav.find((item) => item.href === sub.under) : undefined);
  // The page's own name: its menu item, its sub-page title, or the item inside a section ("JC-1048")
  const title =
    (current?.href === pathname ? current.label : sub?.title) ??
    adminTrail(pathname, new URLSearchParams()).at(-1)?.label ??
    "Dashboard";
  const close = () => setSideOpen(false);

  return (
    <div className="admin-shell">
      <aside className={sideOpen ? "admin-side open" : "admin-side"} id="admin-side" aria-label="Admin menu">
        <Link href="/admin" className="admin-brand" onClick={close}>
          <span className="logo-mark">J</span>
          <span className="admin-word">
            Jay<span>CVS</span>
          </span>
        </Link>
        <nav className="side-nav">
          {nav
            .filter((item) => !item.group)
            .map((item) => (
              <SideLink key={item.href} item={item} active={item === current} onNavigate={close} />
            ))}
          {NAV_GROUPS.map((group) => {
            const items = nav.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="side-group">
                <p className="side-label">{group}</p>
                {items.map((item) => (
                  <SideLink key={item.href} item={item} active={item === current} onNavigate={close} />
                ))}
              </div>
            );
          })}
        </nav>
        <div className="side-foot">
          <a href="/" target="_blank" rel="noopener">
            <Icon name="globe" />
            View website
          </a>
          <SignOutButton />
          <Link
            href="/admin/profile"
            className="side-me"
            aria-current={pathname === "/admin/profile" ? "page" : undefined}
            onClick={close}
          >
            <Avatar initials={user.initials} image={user.image} />
            <span>
              <b>{user.name}</b>
              <small>{user.roleLabel}</small>
            </span>
          </Link>
        </div>
      </aside>
      {sideOpen && <button type="button" className="side-scrim" aria-label="Close menu" onClick={close} />}

      <div className="admin-main">
        <header className={pathname === "/admin" ? "admin-top bare" : "admin-top"}>
          <button
            type="button"
            className="side-toggle"
            aria-label={sideOpen ? "Close menu" : "Open menu"}
            aria-controls="admin-side"
            aria-expanded={sideOpen}
            onClick={() => setSideOpen(!sideOpen)}
          >
            <Icon name="menu" />
          </button>
          <div className="top-titles">
            {/* Only the Website content tab name needs the address's ?tab=, so the rest shows straight away */}
            <Suspense fallback={<Crumbs pathname={pathname} params={new URLSearchParams()} />}>
              <CrumbsWithTab pathname={pathname} />
            </Suspense>
            {/* The Dashboard greets by name in its own heading */}
            {pathname !== "/admin" && <h1>{title}</h1>}
          </div>
        </header>
        <main className="admin-content" id="main">
          <TokensAccessProvider canRequest={canRequestTokens}>{children}</TokensAccessProvider>
        </main>
      </div>
    </div>
  );
}

// The menu item for this page: the longest matching address, so /admin/jobs/abc highlights "Job board"
// and /admin/jobs/new highlights "Post a job"
function currentItem(nav: FrameNavItem[], pathname: string): FrameNavItem | undefined {
  const matches = nav.filter(
    (item) =>
      !item.phase && (item.href === pathname || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

function CrumbsWithTab({ pathname }: { pathname: string }) {
  return <Crumbs pathname={pathname} params={useSearchParams()} />;
}

// Dashboard › Job board › Post a job: every level but the last links back up. The Dashboard has none.
function Crumbs({ pathname, params }: { pathname: string; params: { get(name: string): string | null } }) {
  const trail = adminTrail(pathname, params);
  if (trail.length < 2) return null;
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.slice(0, -1).map((crumb) => (
          <li key={crumb.href}>
            <Link href={crumb.href}>{crumb.label}</Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SideLink({ item, active, onNavigate }: { item: FrameNavItem; active: boolean; onNavigate: () => void }) {
  if (item.phase) {
    return (
      <span className="soon" title={`Arrives in build phase ${item.phase}`}>
        <Icon name={item.icon} />
        {item.label}
        <em>Soon</em>
      </span>
    );
  }
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      <Icon name={item.icon} />
      {item.label}
    </Link>
  );
}
