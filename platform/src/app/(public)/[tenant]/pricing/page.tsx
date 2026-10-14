import type { Metadata } from "next";
import Link from "next/link";
import { CompareTable } from "@/components/content/CompareTable";
import { FaqList } from "@/components/content/FaqList";
import { PackageCards } from "@/components/content/PackageCards";
import { PaymentSection } from "@/components/content/PaymentSection";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { SectionHead } from "@/components/site/SectionHead";
import { formatKes } from "@/lib/money";
import { getPriceList } from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { standardDraftHours } from "@/modules/content/pricing";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent prices for CV writing, cover letters, LinkedIn revamps and career coaching in Kenya. Pay securely by M-Pesa.",
};

const PRICING_FAQS = [
  {
    question: "Do I pay before or after the work?",
    answer:
      "Payment is made upfront by M-Pesa, straight to Jay CVS: a prompt pops up on your phone, or use our Paybill with your order number. Your writer starts as soon as it's confirmed, automatically.",
  },
  {
    question: "Can I upgrade my package later?",
    answer: "Yes. Just pay the difference and we'll add the extra services.",
  },
  {
    question: "Do you offer student or group discounts?",
    answer: "[Yes. Students and groups of 3 or more get [X]% off. Ask us on WhatsApp.]",
  },
  {
    question: "What's your refund policy?",
    answer:
      "[If we haven't started work, we'll refund you in full. Once a draft is delivered, we'll keep revising it until you're satisfied.]",
  },
];

export default async function PricingPage({ params }: PageProps<"/[tenant]/pricing">) {
  const { tenant, settings, freeReviewHref } = await siteContext(params);
  const prices = await getPriceList(tenant.id);
  const draftTime = draftTimeLabel(standardDraftHours(prices.packages));

  return (
    <>
      <PageHero
        crumbs={[{ label: "Pricing" }]}
        title="Simple, transparent pricing"
        lead={`Pick the package that fits your career stage, pay once via M-Pesa, and get your first draft within ${draftTime}. No hidden charges.`}
      />

      <section className="section">
        <div className="container">
          <PackageCards packages={prices.packages} />
        </div>
      </section>

      <PaymentSection prices={prices} whatsapp={settings.whatsapp} paybill={settings.paybill} />

      <section className="section" id="compare">
        <div className="container">
          <SectionHead eyebrow="Compare packages" title="What's included" />
          <CompareTable packages={prices.packages} />
        </div>
      </section>

      <section className="section section-alt" id="individual">
        <div className="container">
          <SectionHead eyebrow="Individual services" title="Just need one thing?">
            <p>Order any service on its own, or add it to a package.</p>
          </SectionHead>
          <div className="price-list">
            {prices.services.map((service) => (
              <div key={service.id} className="price-row reveal">
                <div>
                  <strong>{service.name}</strong>
                  <small>{service.note}</small>
                </div>
                <span className="amount">{formatKes(service.price)}</span>
                <Link className="btn btn-ghost btn-sm" href={`/order?service=${service.id}`}>
                  Order
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container faq-inner">
          <SectionHead eyebrow="Payment FAQ" title="Questions about pricing">
            <p>
              See <a href="#payment">how payment works</a> or the{" "}
              <Link href="/how-it-works">full ordering process</Link>.
            </p>
          </SectionHead>
          <FaqList faqs={PRICING_FAQS} />
        </div>
      </section>

      <CtaBand whatsappHref={freeReviewHref} secondary={{ href: "#payment", label: "How to pay" }} />
    </>
  );
}
