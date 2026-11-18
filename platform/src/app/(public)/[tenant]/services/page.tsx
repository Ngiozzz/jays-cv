import type { Metadata } from "next";
import { formatKes } from "@/lib/money";
import { orderHref } from "@/modules/content/packages";
import Link from "next/link";
import { PackageTable } from "@/components/content/PackageTable";
import { ServiceDetail } from "@/components/services/ServiceDetail";
import { serviceDetails } from "@/components/services/service-details";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { SectionHead } from "@/components/site/SectionHead";
import { getPriceList } from "@/modules/content/content.service";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "Services",
  description: "CV writing, cover letters, LinkedIn revamps, career coaching and job application support in Kenya.",
};

export default async function ServicesPage({ params }: PageProps<"/[tenant]/services">) {
  const { tenant, settings, freeReviewHref } = await siteContext(params);
  const prices = await getPriceList(tenant.id);
  const details = serviceDetails(prices, settings.cvCheckPrice);
  const cheapestSingle = prices.services.length ? Math.min(...prices.services.map((service) => service.price)) : null;
  // "What do you need?": the first step of ordering, straight into the order card with the right item picked
  const choices = [
    ...prices.packages.map((pkg) => ({
      key: pkg.id,
      href: orderHref(pkg.shortName),
      title: pkg.name,
      text: `For ${pkg.bestFor.charAt(0).toLowerCase()}${pkg.bestFor.slice(1)}`,
      tag: pkg.popular ? "Chosen most often" : "Package",
      price: formatKes(pkg.price),
    })),
    {
      key: "single",
      href: "/pricing#individual",
      title: "Just one service",
      text: "Cover letter, LinkedIn, coaching, interview practice",
      tag: "From",
      price: cheapestSingle === null ? "Ask us" : formatKes(cheapestSingle),
    },
  ];

  return (
    <>
      <PageHero
        crumbs={[{ label: "Services" }]}
        title="Services for your next move"
        lead="A sharper CV, a stronger LinkedIn profile or help preparing for interviews. Written by HR consultants who know what Kenyan and international recruiters look for."
      >
        <nav className="jump-links" aria-label="On this page">
          {details.map((detail) => (
            <a key={detail.id} href={`#${detail.id}`}>
              {detail.shortTitle}
            </a>
          ))}
          <a href="#packages">Packages</a>
        </nav>
        <div className="chooser">
          <h2>What do you need?</h2>
          <p>Pick the closest match and we&apos;ll take you to the right order, already filled in.</p>
          <div className="choices">
            {choices.map((choice) => (
              <Link key={choice.key} className="choice" href={choice.href}>
                <b>{choice.title}</b>
                <span>{choice.text}</span>
                <small>
                  {choice.tag} <em>{choice.price}</em>
                </small>
              </Link>
            ))}
          </div>
        </div>
      </PageHero>

      <div className="container svc-list">
        {details.map((detail, i) => (
          <ServiceDetail key={detail.id} {...detail} n={i + 1} />
        ))}
      </div>

      <section className="section section-alt" id="packages">
        <div className="container">
          <SectionHead title="Most clients start with a package">
            <p>Packages combine the services above for one payment by M-Pesa.</p>
          </SectionHead>
          <PackageTable packages={prices.packages} />
        </div>
      </section>

      <CtaBand
        whatsappHref={freeReviewHref}
        title="Not sure which one you need?"
        text="Send your current CV on WhatsApp and we'll recommend the right service, free."
        primaryLabel="Ask on WhatsApp"
        secondary={{ href: "/pricing", label: "See all prices" }}
      />
    </>
  );
}
