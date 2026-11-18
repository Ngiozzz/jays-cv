import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { SectionHead } from "@/components/site/SectionHead";
import { StageTrack } from "@/components/site/StageTrack";

export function HomeSteps({ draftTime }: { draftTime: string }) {
  const steps = [
    {
      title: "Share your details",
      text: "Send your current CV, or your career details, and the jobs you're targeting.",
    },
    { title: "Upload and pay", text: "Pay by M-Pesa prompt. It's confirmed instantly, with no codes to send." },
    { title: "Receive your draft", text: `Your writer delivers a first draft within ${draftTime}, often sooner.` },
    { title: "Review and finalise", text: "Ask for changes until you're happy, then get your CV in Word and PDF." },
  ];
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <SectionHead title="Four steps, all on WhatsApp or email">
          <p>No office visit needed. You can follow every step on your order page.</p>
        </SectionHead>
        <ol className="steps">
          {steps.map((step, i) => (
            <li key={step.title} className="step">
              <StageTrack of={4} at={i} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="after-steps">
          <Link className="link" href="/how-it-works">
            The full process, what we need from you and how to pay <Icon name="arrow" size={16} />
          </Link>
        </p>
      </div>
    </section>
  );
}
