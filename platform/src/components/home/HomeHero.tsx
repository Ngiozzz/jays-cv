import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { HeroFacts } from "@/components/site/HeroFacts";
import type { HomepageStat } from "@/modules/content/content.schema";

type Props = { headline: string; highlight: string; lead: string; draftTime: string; stats: HomepageStat[] };

export function HomeHero({ headline, highlight, lead, draftTime, stats }: Props) {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="dot"></span> Trusted by [2,000+] job seekers across Kenya
            </p>
            <h1>
              {headline} <span className="highlight">{highlight}</span>
            </h1>
            <p className="lead">{lead}</p>
            <div className="hero-ctas">
              <Link className="btn btn-primary btn-lg" href="/pricing">
                I&apos;m a job seeker
              </Link>
              <Link className="btn btn-ghost btn-lg" href="/samples">
                See CV samples
              </Link>
            </div>
            <HeroFacts draftTime={draftTime} />
          </div>

          <div className="hero-visual">
            <img
              className="hero-photo"
              src="/img/photos/hero-professional.jpg"
              alt="Smiling professional working at her desk"
            />
            <div className="float-badge badge-top">
              <Icon name="check" />
              <div>
                <strong>ATS-friendly</strong>
                <small>Passes screening software</small>
              </div>
            </div>
            <div className="float-badge badge-bottom">
              <span className="badge-stars">★★★★★</span>
              <div>
                <strong>[4.9/5]</strong>
                <small>from [300+] reviews</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats" aria-label="Jay CVS in numbers">
        <div className="container stats-inner">
          {stats.map((stat) => (
            <div key={stat.label} className="stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
