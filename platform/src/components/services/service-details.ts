import type { ServiceDetailProps } from "./ServiceDetail";
import { formatKes } from "@/lib/money";
import type { PriceList } from "@/modules/content/content.service";
import { draftTimeLabel, revisionsLabel } from "@/modules/content/packages";
import { lowestPrice, priceByName } from "@/modules/content/pricing";

// "From" prices come from the live price list; copy is the preview's Services page.
// Each button opens the order card: CV writing on "Choose a service", the others with their service picked.
export function serviceDetails(prices: PriceList): ServiceDetailProps[] {
  const from = (amount: number | null, unit = "") => (amount === null ? "Ask us" : `${formatKes(amount)}${unit}`);
  const service = (name: string) => priceByName(prices.services, name);
  const draftTimes = prices.packages.map((p) => p.firstDraftHours);
  const revisionRange = prices.packages.map(revisionsLabel);
  const order = (name?: string) => {
    const picked = name && prices.services.find((item) => item.name === name);
    return picked ? `/order?service=${picked.id}` : "/order";
  };

  return [
    {
      id: "cv-writing",
      shortTitle: "CV writing",
      icon: "doc",
      title: "CV writing & design",
      text: "Your CV has about six seconds to make an impression. We rewrite it around your achievements, not just your duties, and format it to get past the screening software (ATS) many employers use.",
      ticks: [
        "One-on-one consultation with your writer",
        "Tailored to your industry, level and target roles",
        "ATS-friendly layout that recruiters can scan quickly",
        "Delivered in editable Word and PDF formats",
      ],
      meta: [
        { label: "From", value: from(lowestPrice(prices.packages)), href: "/pricing" },
        { label: "Turnaround", value: draftTimes.length ? draftTimeLabel(Math.max(...draftTimes)) : "Ask us" },
        {
          label: "Revisions",
          value: revisionRange.length ? `${revisionRange[0]} – ${revisionRange.at(-1)}` : "Included",
        },
      ],
      action: { label: "Order a CV", href: order() },
      showSamples: true,
      image: { src: "/img/photos/service-cv-writing.jpg", alt: "Professional writing notes beside a laptop" },
    },
    {
      id: "cover-letters",
      shortTitle: "Cover letters",
      icon: "mail",
      title: "Cover & motivation letters",
      text: "A strong letter explains why you're the right fit for this role. We write a letter for each specific job, scholarship or programme, so it never reads like a template.",
      ticks: [
        "Job-specific cover letters",
        "Scholarship and university motivation letters",
        "Statements of purpose and personal statements",
        "Follow-up and thank-you emails after interviews",
      ],
      meta: [
        { label: "From", value: from(service("Cover letter")), href: "/pricing" },
        { label: "Turnaround", value: "24 hours" },
      ],
      action: { label: "Order a letter", href: order("Cover letter") },
      image: { src: "/img/photos/service-cover-letters.jpg", alt: "Writing a letter in a notebook" },
      flip: true,
    },
    {
      id: "linkedin",
      shortTitle: "LinkedIn",
      icon: "linkedin",
      title: "LinkedIn profile revamp",
      text: "Recruiters search LinkedIn every day. We make your profile easy to find and convincing to read, so opportunities come to you.",
      ticks: [
        'Keyword-rich headline and "About" section',
        "Experience rewritten around achievements",
        "Skills, featured section and settings optimised",
        "Tips for growing your network and visibility",
      ],
      meta: [
        { label: "From", value: from(service("LinkedIn profile revamp")), href: "/pricing" },
        { label: "Turnaround", value: "3 days" },
      ],
      action: { label: "Revamp my LinkedIn", href: order("LinkedIn profile revamp") },
      image: { src: "/img/photos/service-linkedin.jpg", alt: "Professional updating an online profile at his desk" },
    },
    {
      id: "career-coaching",
      shortTitle: "Career coaching",
      icon: "compass",
      title: "Career coaching",
      text: "One-on-one sessions with an experienced HR professional, in person in Nairobi or online. Get clear on your next move and walk into interviews confident.",
      ticks: [
        "Career direction and change planning",
        "Mock interviews with detailed feedback",
        "Salary negotiation preparation",
        "Job search strategy for local and international roles",
      ],
      meta: [
        { label: "From", value: from(service("Career coaching session"), " / session") },
        { label: "Session length", value: "60 minutes" },
      ],
      action: { label: "Book a session", href: order("Career coaching session") },
      image: { src: "/img/photos/service-coaching.jpg", alt: "Career coach in a one-on-one session with a client" },
      flip: true,
    },
    {
      id: "job-applications",
      shortTitle: "Job applications",
      icon: "send",
      title: "Job applications & online assessments",
      text: "Online application portals can be confusing and slow. We guide you through each step and help you prepare for the aptitude and psychometric tests that often come next.",
      ticks: [
        "Support with online application portals",
        "Application answers and competency questions",
        "Aptitude and psychometric test preparation",
        "Applications for local, NGO, UN and overseas roles",
      ],
      meta: [{ label: "From", value: from(service("Job application support"), " / application") }],
      action: { label: "Get application help", href: order("Job application support") },
      image: {
        src: "/img/photos/service-job-applications.jpg",
        alt: "Filling in an online job application on a laptop",
      },
    },
  ];
}
