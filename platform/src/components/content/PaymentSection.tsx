import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { SectionHead } from "@/components/site/SectionHead";
import { formatKes } from "@/lib/money";
import { whatsappLink } from "@/modules/content/contact";
import type { PriceList } from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { lowestPrice, standardDraftHours } from "@/modules/content/pricing";

type Props = { prices: PriceList; whatsapp: string; paybill: string; showProcessLink?: boolean };

export function PaymentSection({ prices, whatsapp, paybill, showProcessLink = true }: Props) {
  const singlesFrom = lowestPrice(prices.services);
  return (
    <section className="section section-alt" id="payment">
      <div className="container">
        <SectionHead eyebrow="Payment" title="What you pay, and how to pay">
          <p>One upfront payment by M-Pesa, straight to Jay CVS. No hidden charges, and revisions are included.</p>
        </SectionHead>

        <div className="two-col">
          <div className="card mpesa-card reveal">
            <div className="card-title-row">
              <span className="icon-box icon-green">
                <Icon name="phone" />
              </span>
              <h3>Pay with M-Pesa</h3>
            </div>
            <ol>
              <li>
                <strong>Upload your CV</strong> and get your private tracking link (step 3 of the order card)
              </li>
              <li>
                Tap <strong>Pay with M-Pesa</strong> and enter your M-Pesa number
              </li>
              <li>
                A prompt pops up on your phone. <strong>Enter your PIN.</strong>
              </li>
              <li>
                <strong>That&apos;s it.</strong> Payment is confirmed automatically and your writer starts. No codes or
                SMS to forward.
              </li>
            </ol>
            <p className="paybill-box">
              <span>
                Prefer the M-Pesa menu? <b>Pay Bill {paybill}</b> · Account number: <b>your order number</b> (e.g.
                JC-1048)
              </span>
            </p>
          </div>

          <div className="card reveal">
            <div className="card-title-row">
              <span className="icon-box">
                <Icon name="doc" />
              </span>
              <h3>What you&apos;re paying for</h3>
            </div>
            <ul className="amount-list">
              {prices.packages.map((pkg) => (
                <li key={pkg.id}>
                  <div>
                    <strong>{pkg.name}</strong>
                    <small>{pkg.bestFor}</small>
                  </div>
                  <span className="amount">{formatKes(pkg.price)}</span>
                </li>
              ))}
              {singlesFrom !== null && (
                <li>
                  <div>
                    <strong>Single services</strong>
                    <small>Cover letter, LinkedIn, coaching &amp; more</small>
                  </div>
                  <Link className="amount" href="/pricing#individual">
                    from {formatKes(singlesFrom)}
                  </Link>
                </li>
              )}
            </ul>
            <p className="form-note">
              Every package includes a professional writer, revisions, and your final CV in Word and PDF. Not sure which
              to pick?{" "}
              <a
                href={whatsappLink(whatsapp, "Hi Jay CVS, which package should I choose?")}
                target="_blank"
                rel="noopener"
              >
                Ask us
              </a>{" "}
              and we&apos;ll recommend one before you pay.
            </p>
          </div>
        </div>

        <h3 className="after-pay-title">After you pay</h3>
        <ol className="after-pay">
          <AfterPayStep n={1} title="Payment confirmed">
            Confirmed automatically the moment you pay, and your writer is assigned.
          </AfterPayStep>
          <AfterPayStep n={2} title={`First draft in ${draftTimeLabel(standardDraftHours(prices.packages))}`}>
            Your writer may call with a few questions, then sends your draft.
          </AfterPayStep>
          <AfterPayStep n={3} title="Revise & receive">
            Request changes, then get your final CV in Word and PDF.
          </AfterPayStep>
        </ol>
        {showProcessLink && (
          <p className="pricing-note">
            <Link href="/how-it-works">See the full ordering process →</Link>
          </p>
        )}
      </div>
    </section>
  );
}

function AfterPayStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="reveal">
      <span className="step-num">{n}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </li>
  );
}
