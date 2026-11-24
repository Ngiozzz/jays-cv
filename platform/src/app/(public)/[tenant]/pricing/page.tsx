import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/content/FaqList";
import { packageIncludes } from "@/components/content/package-includes";
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
    answer: "Ask us on WhatsApp before you order and we'll tell you what's available.",
  },
  {
    question: "What's your refund policy?",
    answer:
      "If we haven't started work, we refund you in full. Once a draft is delivered, we keep revising it until you're satisfied.",
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
        title="One price, paid once"
        lead={`Pick the package that fits your career stage, pay by M-Pesa, and get your first draft within ${draftTime}. Revisions are included and there are no hidden charges.`}
      >
        <div className="hero-plans" id="plans">
          <PackageCards
            packages={prices.packages}
            showEta
            includes={(pkg) => packageIncludes(prices.packages.find((p) => p.id === pkg.id)!)}
          />
        </div>
      </PageHero>

      <section className="section section-alt" id="individual">
        <div className="container">
          <SectionHead title="Just need one thing?">
            <p>Order any service on its own, or add it to a package.</p>
          </SectionHead>
          <div className="singles">
            {prices.services.map((service) => (
              <Link key={service.id} className="single" href={`/order?service=${service.id}`}>
                <div>
                  <b>{service.name}</b>
                  <small>{service.note}</small>
                </div>
                <span className="t">{draftTimeLabel(service.firstDraftHours)}</span>
                <span className="p num">{formatKes(service.price)}</span>
              </Link>
            ))}
            {settings.cvCheckPrice > 0 && (
              <Link className="single" href="/jobs">
                <div>
                  <b>CV check for a job</b>
                  <small>Your match out of 100 for one advert, from any job on our board</small>
                </div>
                <span className="t">Minutes</span>
                <span className="p num">{formatKes(settings.cvCheckPrice)}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <PaymentSection prices={prices} whatsapp={settings.whatsapp} paybill={settings.paybill} />

      <section className="section" id="faq">
        <div className="container faq">
          <div className="intro">
            <h2>Questions about pricing</h2>
            <p>
              See the{" "}
              <Link className="text-link" href="/how-it-works">
                full ordering process
              </Link>
            </p>
          </div>
          <FaqList faqs={PRICING_FAQS} />
        </div>
      </section>

      <CtaBand
        whatsappHref={freeReviewHref}
        title="Ready when you are"
        text="Choose a package and upload your CV in a few minutes, or send it on WhatsApp for a free review first."
        primaryLabel="Free review on WhatsApp"
        secondary={{ href: "/order", label: "Start your order" }}
      />
    </>
  );
}
