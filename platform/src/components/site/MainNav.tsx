"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { NAV_ITEMS } from "./nav-items";

type Props = { whatsappHref: string };

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function MainNav({ whatsappHref }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <nav className={open ? "main-nav open" : "main-nav"} id="main-nav" aria-label="Main">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={close} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          className="btn btn-ghost btn-sm nav-track"
          href="/track"
          onClick={close}
          aria-current={isActive(pathname, "/track") ? "page" : undefined}
        >
          <Icon name="search" size={18} />
          Track my order
        </Link>
        <a className="btn btn-primary btn-sm nav-cta" href={whatsappHref} target="_blank" rel="noopener">
          <Icon name="whatsapp" size={18} />
          WhatsApp us
        </a>
      </nav>
      <button
        className="nav-toggle"
        aria-controls="main-nav"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </>
  );
}
