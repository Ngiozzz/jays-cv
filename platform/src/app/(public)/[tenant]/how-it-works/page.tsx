import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaqList } from "@/components/content/FaqList";
import { PaymentSection } from "@/components/content/PaymentSection";
import { Icon } from "@/components/icons/Icon";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { StageTrack } from "@/components/site/StageTrack";
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
      "Yes. We write CVs for the UK, Canada, the US, the Gulf and Europe, following each region's format and expectations.",
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
        <Link className="btn btn-primary head-cta" href="/order">
          Start your order
        </Link>
      </PageHero>

      <Timeline prices={prices} draftTime={draftTime} businessName={tenant.name} />
      <PaymentSection prices={prices} whatsapp={settings.whatsapp} paybill={settings.paybill} showProcessLink={false} />

      <section className="section" id="faq">
        <div className="container faq">
          <div className="intro">
            <h2>Questions about the process</h2>
            <p>
              Still unsure?{" "}
              <a className="text-link" href={whatsappLink(settings.whatsapp)} target="_blank" rel="noopener">
                Ask us on WhatsApp
              </a>
            </p>
          </div>
          <FaqList faqs={PROCESS_FAQS} />
        </div>
      </section>

      <CtaBand
        whatsappHref={freeReviewHref}
        title="Ready to start?"
        text="Upload your CV and pay in a few minutes, or send it on WhatsApp for a free review first."
        primaryLabel="Free review on WhatsApp"
        secondary={{ href: "/order", label: "Start your order" }}
      />
    </>
  );
}

// One order told from start to finish, with what each step looks like on the client's side
function Timeline({ prices, draftTime, businessName }: { prices: PriceList; draftTime: string; businessName: string }) {
  const pkg = prices.packages.find((p) => p.popular) ?? prices.packages[0];
  return (
    <section className="story-flow">
      <div className="container">
        <div className="flow-head">
          <p>Here&apos;s how one order goes, from the first message to the final files.</p>
          {pkg && <span className="mono muted">Example · {pkg.name} package</span>}
        </div>
        <ol className="tl">
          <TimelineStep
            n={1}
            time="Day 1 · 5 minutes"
            title="Share your details"
            art={
              <div className="chat">
                <div className="top">
                  <i>{businessName.charAt(0)}</i>
                  <div>
                    {businessName}
                    <small>usually replies in minutes</small>
                  </div>
                </div>
                <div className="msgs">
                  <div className="bub me">
                    Hi, I&apos;d like my CV redone for accounts jobs in Nairobi<time>09:10</time>
                  </div>
                  <div className="bub me">
                    <span className="file">
                      <i />
                      My_CV_2024.docx
                    </span>
                    This is my current one<time>09:11</time>
                  </div>
                  <div className="bub">
                    Thanks. The {pkg?.name ?? "Professional"} package fits you. Here&apos;s your order link to upload
                    and pay<time>09:14</time>
                  </div>
                </div>
              </div>
            }
          >
            <p>
              Send your current CV on WhatsApp or email, with the jobs or industry you&apos;re aiming for. No CV yet?
              We&apos;ll send a short questionnaire instead.
            </p>
            <Ticks
              items={[
                "Your current CV, in Word or PDF, if you have one",
                "One or two job adverts you're interested in",
                "Anything recent that isn't on your CV yet",
              ]}
            />
          </TimelineStep>

          <TimelineStep
            n={2}
            time="Day 1"
            title="Upload your CV and pay"
            caption="The prompt on your phone. Enter your M-Pesa PIN"
            art={
              <div className="phone">
                <div className="screen">
                  <div className="stk">
                    Do you want to pay {formatKes(pkg?.price ?? 0)} to {businessName.toUpperCase()}, account JC-1052?
                    <span className="pin">••••</span>
                    <span className="btns">
                      <span>CANCEL</span>
                      <span>SEND</span>
                    </span>
                  </div>
                </div>
              </div>
            }
          >
            <p>
              Pick a package, upload your CV and you get a private tracking link. Tap <b>Pay</b> and an M-Pesa prompt
              appears on your phone. It&apos;s confirmed automatically and your writer starts.
            </p>
            <p className="links">
              <a className="link" href="#payment">
                How to pay <Icon name="arrow" size={16} />
              </a>
              <Link className="link" href="/pricing">
                Compare packages <Icon name="arrow" size={16} />
              </Link>
            </p>
          </TimelineStep>

          <TimelineStep
            n={3}
            time={`Within ${draftTime}`}
            title="Receive your first draft"
            now
            art={
              <div className="draft">
                <img src="/img/samples/accountant-after.jpeg" alt="" />
                <div className="note">
                  <b>Draft 1 is ready</b>
                  <span>From your writer: I moved your reconciliations to the top. Tell me what to change.</span>
                  <StageTrack of={5} at={2} />
                </div>
              </div>
            }
          >
            <p>
              Your writer may call or message with a few questions to bring out your achievements. Then your first draft
              arrives, within {draftTime}, sooner for priority packages.
            </p>
          </TimelineStep>

          <TimelineStep
            n={4}
            time="Day 3 to 5"
            title="Review, refine and download"
            art={
              <div className="files">
                <div className="file">
                  <span className="ic docx">DOCX</span>
                  <div>
                    <b>Your_CV.docx</b>
                    <small>Final · editable</small>
                  </div>
                  <Icon name="download" size={16} />
                </div>
                <div className="file">
                  <span className="ic pdf">PDF</span>
                  <div>
                    <b>Your_CV.pdf</b>
                    <small>Final · ready to send</small>
                  </div>
                  <Icon name="download" size={16} />
                </div>
                <div className="done-line">
                  <Icon name="check" size={16} />
                  Order complete
                </div>
              </div>
            }
          >
            <p>
              Tell us what to change and we&apos;ll update it. Once you&apos;re happy, download your final CV from your
              tracking page, ready to send.
            </p>
            <Ticks
              items={[
                "Your CV in editable Word and print-ready PDF",
                "Revisions included in every package",
                "A short guide to tailoring it for each job",
                "30 days of free minor updates",
              ]}
            />
          </TimelineStep>
        </ol>
      </div>
    </section>
  );
}

type StepProps = {
  n: number;
  time: string;
  title: string;
  now?: boolean;
  art: ReactNode;
  caption?: string;
  children: ReactNode;
};

function TimelineStep({ n, time, title, now, art, caption, children }: StepProps) {
  return (
    <li className={now ? "st now" : "st"}>
      <span className="when">{time}</span>
      <span className="node">{n}</span>
      <div>
        <h2>{title}</h2>
        <StageTrack of={4} at={n - 1} />
        {children}
      </div>
      <div className="art" aria-hidden="true">
        {art}
        {caption && <p className="caption">{caption}</p>}
      </div>
    </li>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="ticks">
      {items.map((item) => (
        <li key={item}>
          <Icon name="check" size={16} />
          {item}
        </li>
      ))}
    </ul>
  );
}
