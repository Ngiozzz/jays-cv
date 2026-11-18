import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

const SERVICES = [
  {
    title: "CV writing and design",
    text: "A professionally written, ATS-friendly CV tailored to your industry and level.",
    href: "/services#cv-writing",
    photo: "/img/photos/service-cv-writing.jpg",
  },
  {
    title: "Cover and motivation letters",
    text: "Letters written for the specific role, scholarship or programme.",
    href: "/services#cover-letters",
    photo: "/img/photos/service-job-applications.jpg",
  },
  {
    title: "LinkedIn profile revamp",
    text: "A keyword-rich profile that recruiters find and want to message.",
    href: "/services#linkedin",
    photo: "/img/photos/service-linkedin.jpg",
  },
  {
    title: "Career coaching",
    text: "One-on-one sessions on career direction, interviews and salary negotiation.",
    href: "/services#career-coaching",
    photo: "/img/photos/service-coaching.jpg",
  },
  {
    title: "Job applications and assessments",
    text: "Help with online applications and preparation for aptitude tests.",
    href: "/services#job-applications",
    photo: "/img/photos/blog-cv-mistakes.jpg",
  },
];

// Services as a ledger: numbered rows, each with a photo from the desk, rather than six icon cards
export function HomeServices({ adviceHref }: { adviceHref: string }) {
  return (
    <section className="section section-alt" id="services">
      <div className="container services-ledger">
        <div className="intro">
          <h2>Everything you need for your next role</h2>
          <p>From your first CV to a full career change. We do the writing so you can prepare for the interviews.</p>
          <img
            className="photo"
            src="/img/photos/service-cover-letters.jpg"
            alt="Writing notes in a notebook at a desk"
            loading="lazy"
          />
          <div className="advice">
            <h3>Not sure what you need?</h3>
            <p>Send your current CV on WhatsApp and we&apos;ll recommend the right package, free.</p>
            <a className="link" href={adviceHref} target="_blank" rel="noopener">
              Get free advice <Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
        <div>
          {SERVICES.map((service, i) => (
            <Link key={service.href} className="svc" href={service.href}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </div>
              <img src={service.photo} alt="" loading="lazy" />
              <Icon name="arrow" className="go" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
