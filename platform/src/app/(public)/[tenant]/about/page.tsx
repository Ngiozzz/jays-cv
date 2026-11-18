import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import { ReviewCards } from "@/components/content/ReviewCards";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { CtaBand } from "@/components/site/CtaBand";
import { SectionHead } from "@/components/site/SectionHead";
import { StageTrack } from "@/components/site/StageTrack";
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
    title: "CVs, letters and LinkedIn",
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
    title: "Real before and after",
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

  const firstName = about.ownerName.split(" ")[0] || tenant.name;
  const stats = about.stats.filter((stat) => stat.value && stat.label);

  return (
    <>
      <section className="about-hero">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>About</span>
          </nav>
          <div className="grid">
            <div className="rise">
              <h1>About {tenant.name}</h1>
              {about.lead && <p className="lead">{about.lead}</p>}
              <div className="owner">
                <span className="sign" aria-hidden="true">
                  {firstName}
                </span>
                <span className="role">
                  <b>{about.ownerName}</b>
                  {about.ownerRole}
                </span>
                {ownerLinks.length > 0 && (
                  <span className="links">
                    {ownerLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.href}
                        aria-label={`${about.ownerName} on ${link.label}`}
                        target="_blank"
                        rel="noopener"
                      >
                        <Icon name={link.name} size={16} />
                      </a>
                    ))}
                  </span>
                )}
              </div>
            </div>
            <div className="portrait rise d1">
              {about.photoUrl ? (
                <img src={about.photoUrl} alt={about.ownerName} />
              ) : (
                <span className="mono-initial" aria-hidden="true">
                  {ownerInitials(about.ownerName, tenant.name).charAt(0)}
                </span>
              )}
              <div className="tagline">
                <div>
                  <b>{about.ownerName}</b>
                  <span>{about.ownerRole}</span>
                </div>
                <StageTrack of={5} at={4} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="facts" aria-label={`${tenant.name} in numbers`}>
          <div className="container facts-inner">
            {stats.map((stat) => (
              <div key={stat.label} className="fact">
                <b className="num">{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="container about-story">
          <img
            src="/img/photos/service-cover-letters.jpg"
            alt="Notes being written by hand in a notebook"
            loading="lazy"
          />
          <div className="prose about-text">
            <h2>Our story</h2>
            {/* Markdown builds React elements only, so text typed in the admin can't inject scripts */}
            <Markdown>{about.story}</Markdown>
            {followUs && (
              <div className="about-follow">
                <h3>Follow {tenant.name}</h3>
                <div className="about-follow-links">
                  {settings.channelLink && (
                    <a className="btn btn-ghost btn-sm" href={settings.channelLink} target="_blank" rel="noopener">
                      Our WhatsApp jobs channel
                    </a>
                  )}
                  {businessLinks.map((social) => (
                    <a
                      key={social.name}
                      className="icon-link"
                      href={social.href ?? undefined}
                      aria-label={`${tenant.name} on ${social.label}`}
                      target="_blank"
                      rel="noopener"
                    >
                      <Icon name={social.name} size={16} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <SectionHead title="How we work">
            <p>
              What every order gets, whoever writes it.{" "}
              <Link className="text-link" href="/how-it-works">
                See the full process
              </Link>
            </p>
          </SectionHead>
          <div className="ways">
            {HOW_WE_WORK.map((item, i) => (
              <div key={item.title} className="card way">
                <StageTrack of={HOW_WE_WORK.length} at={i} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {about.team.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead title="Meet the team">
              <p>The people who write your CV.</p>
            </SectionHead>
            <ul className="team">
              {about.team.map((person) => (
                <li key={person.id} className="card member">
                  {person.photoUrl ? (
                    <img src={person.photoUrl} alt={person.name} className="av" />
                  ) : (
                    <span className="av" aria-hidden="true">
                      {ownerInitials(person.name, tenant.name)}
                    </span>
                  )}
                  <div>
                    <b>{person.name}</b>
                    <span className="role">{person.role}</span>
                    {person.note && <p>{person.note}</p>}
                    {person.linkedin && (
                      <a
                        className="text-link"
                        href={person.linkedin}
                        aria-label={`${person.name} on LinkedIn`}
                        target="_blank"
                        rel="noopener"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="section section-alt">
        <div className="container">
          <SectionHead title="What we do" />
          <div className="what-we-do">
            {WHAT_WE_DO.map((item, i) => (
              <Link key={item.href} className="svc" href={item.href}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <span className="link">
                  {item.link} <Icon name="arrow" size={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead title="What our clients say" />
            <ReviewCards reviews={reviews} />
          </div>
        </section>
      )}

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
