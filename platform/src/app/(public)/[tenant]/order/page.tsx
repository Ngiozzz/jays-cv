import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderCard } from "@/components/order/OrderCard";
import { PageHero } from "@/components/site/PageHero";
import { whatsappDigits, whatsappLink } from "@/modules/content/contact";
import { getPriceList } from "@/modules/content/content.service";
import { findJobForOrder } from "@/modules/jobs/jobs.repo";
import { draftTimeLabel } from "@/modules/content/packages";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "Order your CV",
  description: "Order a professional CV, cover letter or LinkedIn revamp in three quick steps. Pay by M-Pesa.",
};

export default async function OrderPage({ params, searchParams }: PageProps<"/[tenant]/order">) {
  const { tenant, settings } = await siteContext(params);
  const prices = await getPriceList(tenant.id);
  const packages = prices.packages.map((pkg) => ({
    id: pkg.id,
    shortName: pkg.shortName,
    name: pkg.name,
    price: pkg.price,
    bestFor: pkg.bestFor,
    draft: draftTimeLabel(pkg.firstDraftHours),
  }));
  const services = prices.services.map((service) => ({
    id: service.id,
    name: service.name,
    note: service.note,
    price: service.price,
    needsJobAdvert: service.needsJobAdvert,
  }));
  const card = {
    packages,
    services,
    businessName: tenant.name,
    waNumber: whatsappDigits(settings.whatsapp),
    whatsappHref: whatsappLink(settings.whatsapp, `Hi ${tenant.name}, I have a question before I order`),
  };

  return (
    <>
      <PageHero
        crumbs={[{ label: "Order" }]}
        title="Order your CV"
        lead="Three quick steps: choose a service, pick a package and upload your CV. You'll get a private link to pay and follow your order."
      />
      <div className="container journey-wrap">
        {/* The card reads ?pkg= or ?service= from the address to start on the right choice;
            ?job= (from a job page's "Get my CV tailored") starts a tailored CV for that job */}
        <Suspense>
          <CardForJob tenantId={tenant.id} searchParams={searchParams} card={card} />
        </Suspense>
      </div>
    </>
  );
}

async function CardForJob({
  tenantId,
  searchParams,
  card,
}: {
  tenantId: string;
  searchParams: PageProps<"/[tenant]/order">["searchParams"];
  card: Omit<Parameters<typeof OrderCard>[0], "job">;
}) {
  const slug = (await searchParams).job;
  const job = typeof slug === "string" && slug ? await findJobForOrder(tenantId, slug.slice(0, 200)) : null;
  return <OrderCard {...card} job={job && { slug: job.slug, title: job.title, company: job.company }} />;
}
