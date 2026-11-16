import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import { ReviewCards } from "@/components/content/ReviewCards";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { SectionHead } from "@/components/site/SectionHead";
import { OWNER_LINKS, ownerInitials } from "@/modules/content/admin/about";
import { getAboutPage, getFeaturedReviews } from "@/modules/content/content.service";
import { footerContact } from "@/modules/content/footer";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Jay CVS has helped job seekers across Kenya since 2018: professional CV writing, cover letters, LinkedIn profiles and a free jobs board, from Nairobi.",
};

const WHAT_WE_DO: { icon: IconName; title: string; text: string; href: string; link: string }[] = [
  {
    icon: "doc",
    title: "CVs, letters & LinkedIn",
    text: "Professionally written CVs, cover letters and LinkedIn profiles, tailored to the job you want.",
    href: "/services",
    link: "See our services",
  },
  {
    icon: "briefcase",
    title: "A free jobs board",
    text: "New openings from across Kenya every day, also shared on our WhatsApp job channel.",
    href: "/jobs",
    link: "Find a job",
  },
  {
    icon: "image",
    title: "Real before & after",
    text: "See how we turn a list of duties into a CV that shows what you achieved.",
    href: "/samples",
    link: "See CV samples",
  },
];

const HOW_WE_WORK: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "users",
    title: "A real writer",
    text: "A person, not a template, writes your CV and calls you if they need to know more.",
  },
  {
    icon: "clock",
    title: "On time",
    text: "You see the exact time your draft is due, and follow every step on your tracking page.",
  },
  {
    icon: "refresh",
    title: "Changes included",
    text: "Read your draft, tell your writer what to change, and approve it only when you're happy.",
  },
  {
    icon: "phone",
    title: "Pay by M-Pesa",
    text: "One payment by M-Pesa prompt or Paybill. No hidden charges.",
  },
];

// The owner's own words, photo, team and numbers (edited in Website content → About page), then what
// the business does and how it works
export default async function AboutPage({ params }: PageProps<"/[tenant]/about">) {
  const { tenant, settings, freeReviewHref } = await siteContext(params);
  const [about, reviews] = await Promise.all([getAboutPage(tenant.id), getFeaturedReviews(tenant.id)]);
  const ownerLinks = OWNER_LINKS.flatMap((link) =>
    about.ownerLinks[link.name] ? [{ ...link, href: about.ownerLinks[link.name]! }] : [],
  );
  // The business's own pages and the job channel, from Business settings
  const businessLinks = footerContact(settings).socials.filter((social) => social.href);
  const followUs = businessLinks.length > 0 || settings.channelLink;

  return (
    <>
      <PageHero crumbs={[{ label: "About" }]} title={`About ${tenant.name}`} lead={about.lead} />

      <section className="section">
        <div className="container about-story">
          <figure className="about-owner">
            {about.photoUrl ? (
              <img src={about.photoUrl} alt={about.ownerName} className="about-photo" />
            ) : (
              <span className="about-photo about-initials" aria-hidden="true">
                {ownerInitials(about.ownerName, tenant.name)}
              </span>
            )}
            <figcaption>
              <strong>{about.ownerName}</strong>
              <span>{about.ownerRole}</span>
              {ownerLinks.length > 0 && (
                <span className="about-links">
                  {ownerLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      aria-label={`${about.ownerName} on ${link.label}`}
                      target="_blank"
                      rel="noopener"
                    >
                      <Icon name={link.name} />
                    </a>
                  ))}
                </span>
              )}
            </figcaption>
          </figure>
          <div className="prose about-text">
            <p className="eyebrow">Our story</p>
            {/* Markdown builds React elements only, so text typed in the admin can't inject scripts */}
            <Markdown>{about.story}</Markdown>
            {followUs && (
              <div className="about-follow">
                <p className="eyebrow">Follow {tenant.name}</p>
                <div className="about-follow-links">
                  {settings.channelLink && (
                    <a className="btn btn-wa btn-sm" href={settings.channelLink} target="_blank" rel="noopener">
                      <Icon name="whatsapp" /> Our WhatsApp job channel
                    </a>
                  )}
                  {businessLinks.length > 0 && (
                    <span className="about-links">
                      {businessLinks.map((social) => (
                        <a
                          key={social.name}
                          href={social.href ?? undefined}
                          aria-label={`${tenant.name} on ${social.label}`}
                          target="_blank"
                          rel="noopener"
                        >
                          <Icon name={social.name} />
                        </a>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {about.team.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <SectionHead eyebrow="Our team" title="Meet the people who write your CV" />
            <ul className="card-grid team-grid">
              {about.team.map((person) => (
                <li key={person.id} className="card team-card reveal">
                  {person.photoUrl ? (
                    <img src={person.photoUrl} alt={person.name} className="team-photo" />
                  ) : (
                    <span className="team-photo about-initials" aria-hidden="true">
                      {ownerInitials(person.name, tenant.name)}
                    </span>
                  )}
                  <h3>{person.name}</h3>
                  <span className="team-role">{person.role}</span>
                  {person.note && <p>{person.note}</p>}
                  {person.linkedin && (
                    <a
                      className="team-linkedin"
                      href={person.linkedin}
                      aria-label={`${person.name} on LinkedIn`}
                      target="_blank"
                      rel="noopener"
                    >
                      <Icon name="linkedin" /> LinkedIn
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="stats" aria-label={`${tenant.name} in numbers`}>
        <div className="container stats-inner">
          {about.stats.map((stat) => (
            <div key={stat.label} className="stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="What we do" title="Everything a job seeker needs, in one place" />
          <div className="card-grid grid-3">
            {WHAT_WE_DO.map((item) => (
              <Link key={item.href} className="card service-card reveal" href={item.href}>
                <span className="icon-box">
                  <Icon name={item.icon} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="card-link">
                  {item.link} <Icon name="arrow" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <SectionHead eyebrow="How we work" title="What you can count on">
            <p>
              <Link href="/how-it-works">See the full process</Link>, from your order to your final CV.
            </p>
          </SectionHead>
          <div className="card-grid about-promises">
            {HOW_WE_WORK.map((item) => (
              <div key={item.title} className="card reveal">
                <span className="icon-box">
                  <Icon name={item.icon} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead eyebrow="Client stories" title="What our clients say" />
            <ReviewCards reviews={reviews} />
          </div>
        </section>
      )}

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
