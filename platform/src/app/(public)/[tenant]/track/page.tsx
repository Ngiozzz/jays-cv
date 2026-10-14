import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icons/Icon";
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
        <div className="track-card lookup">
          <span className="icon-box">
            <Icon name="search" />
          </span>
          <h1>Track your order</h1>
          <p>
            Enter your order number and the phone number you ordered with. You&apos;ll find the order number in the
            message we sent you.
          </p>
          <Suspense>
            <LookupForm prefix={tenant.orderPrefix} />
          </Suspense>
          <p className="track-help">
            Lost your details?{" "}
            <a
              href={whatsappLink(settings.whatsapp, "Hi, I need help finding my order.")}
              target="_blank"
              rel="noopener"
            >
              Ask us on WhatsApp
            </a>
            .
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
