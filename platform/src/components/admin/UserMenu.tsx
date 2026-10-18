"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "./Avatar";
import { SignOutButton } from "./SignOutButton";

type Props = { name: string; roleLabel: string; initials: string; image: string | null };

// The name in the top bar opens a small menu: View profile, Sign out
export function UserMenu({ name, roleLabel, initials, image }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Close when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={box}>
      <button
        type="button"
        className="user-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Avatar initials={initials} image={image} />
        <span className="user-chip-text">
          <strong>{name}</strong>
          <span>{roleLabel}</span>
        </span>
        <svg className="user-chip-caret" aria-hidden="true" viewBox="0 0 12 12">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {open && (
        <div className="user-menu-list" role="menu">
          <Link href="/admin/profile" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="users" />
            View profile
          </Link>
          <SignOutButton />
        </div>
      )}
    </div>
  );
}
