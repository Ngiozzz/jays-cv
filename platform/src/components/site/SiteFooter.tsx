import { cacheLife } from "next/cache";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { FooterContact } from "@/modules/content/footer";
import { Logo } from "./Logo";
import { NAV_ITEMS } from "./nav-items";

const SERVICE_LINKS = [
  { href: "/services#cv-writing", label: "CV writing" },
  { href: "/services#cover-letters", label: "Cover letters" },
  { href: "/services#linkedin", label: "LinkedIn revamp" },
  { href: "/services#career-coaching", label: "Career coaching" },
  { href: "/services#job-applications", label: "Job applications" },
];

export function SiteFooter({ contact, businessName }: { contact: FooterContact; businessName: string }) {
  const socials = contact.socials.filter((social) => social.href);
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo light />
          <p>Professional CV writing and career services, helping Kenyans land the jobs they deserve since 2018.</p>
          {socials.length > 0 && (
            <div className="socials">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href ?? undefined}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener"
                >
                  <Icon name={social.name} />
                </a>
              ))}
            </div>
          )}
        </div>
        <FooterLinks title="Services" links={SERVICE_LINKS} />
        <FooterLinks title="Company" links={NAV_ITEMS} />
        <div>
          <h4>Get in touch</h4>
          <ul className="contact-list">
            <li>
              <a href={contact.phoneHref}>{contact.phoneText}</a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
            <li>{contact.address}</li>
            <li className="paybill">
              Pay by M-Pesa: <strong>Pay Bill {contact.paybill}</strong>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>
          {/* The team's way into the admin: looks like plain text so clients don't notice it.
              Access is protected by invite-only sign-in, not by hiding this link. */}
          <Link className="quiet-link" href="/admin" prefetch={false} aria-label="Team sign in">
            ©
          </Link>{" "}
          2018–
          <CurrentYear /> {businessName} HR Consultancy. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: ReadonlyArray<{ href: string; label: string }> }) {
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Cached for a day so the page can stay static while the year still rolls over on its own
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
