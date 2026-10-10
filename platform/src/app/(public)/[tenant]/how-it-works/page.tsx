import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaqList } from "@/components/content/FaqList";
import { PaymentSection } from "@/components/content/PaymentSection";
import { CtaBand } from "@/components/site/CtaBand";
import { HeroFacts } from "@/components/site/HeroFacts";
import { PageHero } from "@/components/site/PageHero";
import { SectionHead } from "@/components/site/SectionHead";
import { formatKes } from "@/lib/money";
import { whatsappLink } from "@/modules/content/contact";
import { getPriceList, type PriceList } from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { standardDraftHours } from "@/modules/content/pricing";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How to order your professional CV from Jay CVS: share your details, pay via M-Pesa, receive your draft and finalise. Everything online.",
};

const PROCESS_FAQS = [
  {
    question: "Do I need to visit your office?",
    answer:
      "No. Everything can be done on WhatsApp, phone and email. You're welcome to visit us at our office if you prefer to meet in person.",
  },
  {
    question: "Can I get my CV faster?",
    answer:
      "Yes. The Professional and Executive packages include priority delivery. For urgent deadlines, tell us when you order and we'll do our best to help.",
  },
  {
    question: "What if I don't like the draft?",
    answer:
      "Every package includes revisions. Tell us what to change and your writer will update it until you're happy.",
  },
  {
    question: "Is my information kept private?",
    answer:
      "Yes. Your details are only used to write your documents. We never share them, and we only show a CV as a sample with your written permission and personal details removed.",
  },
  {
    question: "Can you help if I'm applying abroad?",
    answer:
      "Absolutely. We write CVs for the UK, Canada, the US, the Gulf and Europe, following each region's format and expectations.",
  },
];

export default async function HowItWorksPage({ params }: PageProps<"/[tenant]/how-it-works">) {
  const { tenant, settings, freeReviewHref } = await siteContext(params);
  const prices = await getPriceList(tenant.id);
  const draftTime = draftTimeLabel(standardDraftHours(prices.packages));

  return (
    <>
      <PageHero
        crumbs={[{ label: "How it works" }]}
        title="From old CV to interview-ready in four steps"
        lead="No office visit needed. Everything happens on WhatsApp or email, from anywhere in Kenya or abroad."
      >
        <HeroFacts draftTime={draftTime} style={{ justifyContent: "center" }} />
      </PageHero>

      <Timeline prices={prices} draftTime={draftTime} />
      <PaymentSection prices={prices} whatsapp={settings.whatsapp} paybill={settings.paybill} showProcessLink={false} />

      <section className="section" id="faq">
        <div className="container faq-inner">
          <SectionHead eyebrow="FAQ" title="Common questions about the process">
            <p>
              Still unsure?{" "}
              <a href={whatsappLink(settings.whatsapp)} target="_blank" rel="noopener">
                Chat with us
              </a>
              . We usually reply within 5 minutes.
            </p>
          </SectionHead>
          <FaqList faqs={PROCESS_FAQS} />
        </div>
      </section>

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}

function Timeline({ prices, draftTime }: { prices: PriceList; draftTime: string }) {
  return (
    <section className="section">
      <div className="container">
        <ol className="timeline">
          <TimelineStep n={1} time="Day 1 · 5 minutes" title="Share your details">
            <p>
              Send us your current CV on WhatsApp or email, along with the jobs or industry you&apos;re targeting. No CV
              yet? We&apos;ll send you a short questionnaire instead.
            </p>
            <Ticks
              items={[
                "Your current CV (Word or PDF), if you have one",
                "One or two job adverts you're interested in",
                "Anything recent that isn't on your CV yet",
              ]}
            />
          </TimelineStep>
          <TimelineStep n={2} time="Day 1" title="Choose a package, upload your CV & pay">
            <p>
              Pick the package that fits your career stage (not sure? we&apos;ll recommend one), upload your CV, and
              you&apos;ll get your private tracking link. Then tap <strong>Pay</strong>: an M-Pesa prompt pops up on
              your phone. It&apos;s confirmed automatically and your writer is assigned right away.
            </p>
            <ul className="step-prices">
              {prices.packages.map((pkg) => (
                <li key={pkg.id}>
                  <span>{pkg.name}</span>
                  <strong>{formatKes(pkg.price)}</strong>
                </li>
              ))}
            </ul>
            <p className="step-links">
              <a href="#payment">Step-by-step payment guide ↓</a> · <Link href="/pricing">Compare packages →</Link>
            </p>
          </TimelineStep>
          <TimelineStep n={3} time={`Within ${draftTime}`} title="Receive your first draft">
            <p>
              Your writer may call or message you with a few questions to bring out your achievements. You&apos;ll then
              receive a first draft, usually within {draftTime} and sooner for priority packages.
            </p>
          </TimelineStep>
          <TimelineStep n={4} time="Day 3–5" title="Review, refine & download">
            <p>
              Tell us what you&apos;d like changed and we&apos;ll update it. Once you&apos;re happy, you get your final
              CV in editable Word and PDF formats, ready to send.
            </p>
            <Ticks
              items={[
                "Your CV in editable Word (.docx) and print-ready PDF",
                "Revisions included in every package",
                "A short guide to tailoring your CV for each job",
                "30 days of free minor updates",
              ]}
            />
          </TimelineStep>
        </ol>
      </div>
    </section>
  );
}

function TimelineStep({ n, time, title, children }: { n: number; time: string; title: string; children: ReactNode }) {
  return (
    <li className="timeline-item reveal">
      <span className="step-num">{String(n).padStart(2, "0")}</span>
      <div className="timeline-body">
        <span className="timeline-time">{time}</span>
        <h3>{title}</h3>
        {children}
      </div>
    </li>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="ticks">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
