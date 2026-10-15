import type { Metadata } from "next";
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
  const { tenant, freeReviewHref } = await siteContext(params);
  const prices = await getPriceList(tenant.id);
  const details = serviceDetails(prices);

  return (
    <>
      <PageHero
        crumbs={[{ label: "Services" }]}
        title="Services to move your career forward"
        lead="Whether you need a sharper CV, a stronger LinkedIn profile or help preparing for interviews, our HR experts have you covered."
      >
        <div className="jump-links">
          {details.map((detail) => (
            <a key={detail.id} href={`#${detail.id}`}>
              {detail.shortTitle}
            </a>
          ))}
        </div>
      </PageHero>

      <section>
        <div className="container">
          {details.map((detail) => (
            <ServiceDetail key={detail.id} {...detail} />
          ))}
        </div>
      </section>

      <section className="section section-alt" id="packages">
        <div className="container">
          <SectionHead eyebrow="Next step" title="Ready to order? Pick a package">
            <p>
              Most clients start with a package that combines the services above. Pay once via M-Pesa.{" "}
              <Link href="/pricing#payment">How payment works</Link>.
            </p>
          </SectionHead>
          <PackageTable packages={prices.packages} />
        </div>
      </section>

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
