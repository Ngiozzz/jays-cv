"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { SignOutButton } from "./SignOutButton";
import { UserMenu } from "./UserMenu";
import { adminTrail, SUB_PAGES } from "./admin-nav";

export type FrameNavItem = { href: string; label: string; icon: IconName; phase?: number };
export type FrameUser = { name: string; roleLabel: string; initials: string; image: string | null };

type Props = { nav: FrameNavItem[]; user: FrameUser; children: ReactNode };

// The admin shell from the preview: dark sidebar, top bar with the page title and who is signed in
export function AdminFrame({ nav, user, children }: Props) {
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);
  const sub = SUB_PAGES[pathname];
  const current = (sub?.under && nav.find((item) => item.href === sub.under)) || currentItem(nav, pathname);

  return (
    <div className="admin-shell">
      <aside className={sideOpen ? "admin-side open" : "admin-side"} id="admin-side" aria-label="Admin menu">
        <Link href="/admin" className="admin-logo">
          <span className="logo-mark">J</span>
          <span className="logo-text">
            Jay<strong>CVS</strong>
          </span>
          <span className="admin-badge">Admin</span>
        </Link>
        <nav className="side-nav">
          {nav.map((item) => (
            <SideLink
              key={item.href}
              item={item}
              active={item === current && !(sub && !sub.under)}
              onNavigate={() => setSideOpen(false)}
            />
          ))}
        </nav>
        <div className="side-foot">
          <a href="/" target="_blank" rel="noopener">
            <Icon name="globe" />
            View website
          </a>
          <SignOutButton />
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-top">
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
            <h1>{sub?.title ?? current.label}</h1>
          </div>
          <div className="admin-top-actions">
            <UserMenu {...user} />
          </div>
        </header>
        <main className="admin-content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}

// The menu item for this page: the longest matching address, so /admin/jobs/abc highlights "Job Board"
// and /admin/team/… highlights "Team"
function currentItem(nav: FrameNavItem[], pathname: string): FrameNavItem {
  const matches = nav.filter(
    (item) =>
      !item.phase && (item.href === pathname || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0] ?? nav[0];
}

function CrumbsWithTab({ pathname }: { pathname: string }) {
  return <Crumbs pathname={pathname} params={useSearchParams()} />;
}

// Dashboard › Job Board › Post a job: every level but the last links back up
function Crumbs({ pathname, params }: { pathname: string; params: { get(name: string): string | null } }) {
  const trail = adminTrail(pathname, params);
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((crumb, i) =>
          i === trail.length - 1 ? (
            <li key={crumb.href}>
              <span aria-current="page">{crumb.label}</span>
            </li>
          ) : (
            <li key={crumb.href}>
              <Link href={crumb.href}>{crumb.label}</Link>
            </li>
          ),
        )}
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
