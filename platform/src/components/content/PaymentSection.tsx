import Link from "next/link";
import { SectionHead } from "@/components/site/SectionHead";
import { StageTrack } from "@/components/site/StageTrack";
import { formatKes } from "@/lib/money";
import { whatsappLink } from "@/modules/content/contact";
import type { PriceList } from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { lowestPrice, standardDraftHours } from "@/modules/content/pricing";

type Props = { prices: PriceList; whatsapp: string; paybill: string; showProcessLink?: boolean };

// "What you pay, and how": the M-Pesa steps, the Pay Bill fallback, the amounts, and what happens after paying
export function PaymentSection({ prices, whatsapp, paybill, showProcessLink = true }: Props) {
  const singlesFrom = lowestPrice(prices.services);
  return (
    <section className="section section-alt" id="payment">
      <div className="container">
        <SectionHead title="What you pay, and how">
          <p>One payment by M-Pesa, straight to Jay CVS. No hidden charges, and revisions are included.</p>
        </SectionHead>

        <div className="paybox">
          <div className="card">
            <h3>Pay with M-Pesa</h3>
            <ol className="mp-steps">
              <li>
                <span>
                  <b>Upload your CV</b> and get your private tracking link
                </span>
              </li>
              <li>
                <span>
                  Tap <b>Pay with M-Pesa</b> and enter your M-Pesa number
                </span>
              </li>
              <li>
                <span>
                  A prompt appears on your phone. <b>Enter your PIN</b>
                </span>
              </li>
              <li>
                <span>
                  <b>That&apos;s it.</b> Payment is confirmed automatically and your writer starts. No codes or SMS to
                  forward
                </span>
              </li>
            </ol>
            <p className="paybill-box">
              <span>
                Prefer the M-Pesa menu? <b>Pay Bill {paybill}</b>
              </span>
              <span>
                Account: <b>your order number</b>, like JC-1048
              </span>
            </p>
          </div>

          <div className="card">
            <h3>What you&apos;re paying for</h3>
            <ul className="amount-list">
              {prices.packages.map((pkg) => (
                <li key={pkg.id}>
                  <div>
                    <b>{pkg.name}</b>
                    <small>{pkg.bestFor}</small>
                  </div>
                  <span className="amount">{formatKes(pkg.price)}</span>
                </li>
              ))}
              {singlesFrom !== null && (
                <li>
                  <div>
                    <b>Single services</b>
                    <small>Cover letter, LinkedIn, coaching and more</small>
                  </div>
                  <Link className="amount text-link" href="/pricing#individual">
                    from {formatKes(singlesFrom)}
                  </Link>
                </li>
              )}
            </ul>
            <p className="fine">
              Every package includes a professional writer, revisions, and your final CV in Word and PDF. Not sure which
              to pick?{" "}
              <a
                className="text-link"
                href={whatsappLink(whatsapp, "Hi Jay CVS, which package should I choose?")}
                target="_blank"
                rel="noopener"
              >
                Ask us
              </a>
            </p>
          </div>
        </div>

        <ol className="after-pay">
          <li>
            <StageTrack of={5} at={1} />
            <h4>Payment confirmed</h4>
            <p>The moment you pay, and your writer is assigned.</p>
          </li>
          <li>
            <StageTrack of={5} at={3} />
            <h4>First draft within {draftTimeLabel(standardDraftHours(prices.packages))}</h4>
            <p>Your writer may call with a few questions, then sends your draft.</p>
          </li>
          <li>
            <StageTrack of={5} at={4} />
            <h4>Revise and receive</h4>
            <p>Ask for changes, then download your final CV in Word and PDF.</p>
          </li>
        </ol>
        {showProcessLink && (
          <p className="plans-note">
            <Link className="text-link" href="/how-it-works">
              See the full ordering process
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
