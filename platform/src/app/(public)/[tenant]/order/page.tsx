import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderCard } from "@/components/order/OrderCard";
import { PageHero } from "@/components/site/PageHero";
import { whatsappDigits, whatsappLink } from "@/modules/content/contact";
import { getPriceList } from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "Order your CV",
  description: "Order a professional CV, cover letter or LinkedIn revamp in three quick steps. Pay by M-Pesa.",
};

export default async function OrderPage({ params }: PageProps<"/[tenant]/order">) {
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
  }));

  return (
    <>
      <PageHero
        crumbs={[{ label: "Order" }]}
        title="Order your CV"
        lead="Three quick steps: choose a service, pick a package and upload your CV. You'll get a private link to pay and follow your order."
      />
      <div className="container journey-wrap">
        {/* The card reads ?pkg= or ?service= from the address to start on the right choice */}
        <Suspense>
          <OrderCard
            packages={packages}
            services={services}
            businessName={tenant.name}
            waNumber={whatsappDigits(settings.whatsapp)}
            whatsappHref={whatsappLink(settings.whatsapp, `Hi ${tenant.name}, I have a question before I order`)}
          />
        </Suspense>
      </div>
    </>
  );
}
