import Link from "next/link";
import { SectionHead } from "@/components/site/SectionHead";

export function HomeSteps({ draftTime }: { draftTime: string }) {
  const steps = [
    { title: "Share your details", text: "Send your current CV (or career details) and the jobs you're targeting." },
    {
      title: "Upload & pay",
      text: "Upload your CV, then pay by M-Pesa prompt. It's confirmed instantly, with no codes to send.",
    },
    { title: "Receive your draft", text: `Your writer delivers a first draft within ${draftTime}, sometimes sooner.` },
    {
      title: "Review & finalise",
      text: "Request changes until you're happy, then get your final CV in Word and PDF.",
    },
  ];
  return (
    <section className="section section-alt" id="how-it-works">
      <div className="container">
        <SectionHead eyebrow="How it works" title="Four simple steps to a better CV">
          <p>No office visit needed. Everything happens on WhatsApp or email.</p>
        </SectionHead>

        <ol className="steps">
          {steps.map((step, i) => (
            <li key={step.title} className="step reveal">
              <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="pricing-note">
          <Link href="/how-it-works">See the full process, what we need from you and payment steps →</Link>
        </p>
      </div>
    </section>
  );
}
