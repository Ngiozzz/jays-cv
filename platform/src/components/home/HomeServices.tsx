import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { SectionHead } from "@/components/site/SectionHead";

const SERVICES: { icon: IconName; title: string; text: string; href: string }[] = [
  {
    icon: "doc",
    title: "CV writing & design",
    text: "A professionally written, ATS-friendly CV tailored to your industry and level.",
    href: "/services#cv-writing",
  },
  {
    icon: "mail",
    title: "Cover & motivation letters",
    text: "Persuasive letters written for the specific role, scholarship or programme.",
    href: "/services#cover-letters",
  },
  {
    icon: "linkedin",
    title: "LinkedIn profile revamp",
    text: "A keyword-rich profile that recruiters find and want to message.",
    href: "/services#linkedin",
  },
  {
    icon: "compass",
    title: "Career coaching",
    text: "One-on-one sessions on career direction, interviews and salary negotiation.",
    href: "/services#career-coaching",
  },
  {
    icon: "send",
    title: "Job applications & assessments",
    text: "Support with online applications and preparation for aptitude tests.",
    href: "/services#job-applications",
  },
];

export function HomeServices({ adviceHref }: { adviceHref: string }) {
  return (
    <section className="section" id="services">
      <div className="container">
        <SectionHead eyebrow="What we do" title="Everything you need to land your next role">
          <p>From your first CV to a full career makeover. We handle the writing so you can focus on the interviews.</p>
        </SectionHead>

        <div className="card-grid grid-3">
          {SERVICES.map((service) => (
            <Link key={service.href} className="card service-card reveal" href={service.href}>
              <span className="icon-box">
                <Icon name={service.icon} />
              </span>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <span className="card-link">
                Learn more <Icon name="arrow" />
              </span>
            </Link>
          ))}
          <a className="card service-card service-card-cta reveal" href={adviceHref} target="_blank" rel="noopener">
            <h3>Not sure what you need?</h3>
            <p>Send us your current CV on WhatsApp and we&apos;ll recommend the right package. Free.</p>
            <span className="card-link">
              Get free advice <Icon name="arrow" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
