"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { SignOutButton } from "./SignOutButton";

export type FrameNavItem = { href: string; label: string; icon: IconName; phase?: number };
export type FrameUser = { name: string; roleLabel: string; initials: string };

type Props = { nav: FrameNavItem[]; user: FrameUser; children: ReactNode };

// The admin shell from the preview: dark sidebar, top bar with the page title and who is signed in
export function AdminFrame({ nav, user, children }: Props) {
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);
  const current = nav.find((item) => item.href === pathname) ?? nav[0];

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
              active={item.href === pathname}
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
            <p className="crumb">Overview</p>
            <h1>{current.label}</h1>
          </div>
          <div className="admin-top-actions">
            <div className="user-chip">
              <span className="avatar">{user.initials}</span>
              <div>
                <strong>{user.name}</strong>
                <span>{user.roleLabel}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="admin-content" id="main">
          {children}
        </main>
      </div>
    </div>
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
