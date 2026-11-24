import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icons/Icon";
import { Breadcrumb } from "@/components/site/PageHero";
import { LookupForm } from "@/components/track/LookupForm";
import { whatsappLink } from "@/modules/content/contact";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the progress of your CV order with your order number and phone number.",
};

export default async function TrackLookupPage({ params }: PageProps<"/[tenant]/track">) {
  const { tenant, settings } = await siteContext(params);
  return (
    <div className="track-page">
      <div className="container track-wrap">
        <div className="lookup">
          <Breadcrumb crumbs={[{ label: "Track my order" }]} />
          <h1>Track your order</h1>
          <p>
            Use the private link we sent you on WhatsApp, or enter your order number and the phone number you ordered
            with.
          </p>
          <Suspense>
            <LookupForm prefix={tenant.orderPrefix} />
          </Suspense>
          <p className="track-help">
            Can&apos;t find it?{" "}
            <a
              href={whatsappLink(settings.whatsapp, "Hi, I need help finding my order.")}
              target="_blank"
              rel="noopener"
            >
              Message us on WhatsApp
            </a>
          </p>
          <p className="private-note">
            <Icon name="lock" />
            Only someone with your order number and phone number can see your order.
          </p>
        </div>
      </div>
    </div>
  );
}
