"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ComponentProps } from "react";
import { Icon } from "@/components/icons/Icon";
import { NAV_ITEMS } from "./nav-items";

type Props = { whatsappHref: string };

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

type NavLinkProps = ComponentProps<typeof Link> & { href: string };

// Only the links read the URL. On pages whose address isn't known at build time (a tracking link),
// the link is first printed without the "current page" mark, so the rest of the page still prerenders
function NavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <MarkedNavLink {...props} />
    </Suspense>
  );
}

function MarkedNavLink(props: NavLinkProps) {
  const pathname = usePathname();
  return <Link {...props} aria-current={isActive(pathname, props.href) ? "page" : undefined} />;
}

export function MainNav({ whatsappHref }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <nav className={open ? "main-nav open" : "main-nav"} id="main-nav" aria-label="Main">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} onClick={close}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <NavLink className="nav-track" href="/track" onClick={close}>
          Track my order
        </NavLink>
        <a className="btn btn-primary btn-sm nav-cta" href={whatsappHref} target="_blank" rel="noopener">
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
        <Icon name={open ? "close" : "menu"} size={18} />
      </button>
    </>
  );
}
