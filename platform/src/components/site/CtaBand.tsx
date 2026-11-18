import Link from "next/link";

type Props = {
  whatsappHref: string;
  title?: string;
  text?: string;
  primaryLabel?: string;
  secondary?: { href: string; label: string };
};

const SEE_PRICES = { href: "/pricing", label: "See packages" };

export function CtaBand({
  whatsappHref,
  title = "Send us your CV for a free review",
  text = "Share your current CV on WhatsApp and we'll tell you what to fix and which package fits. We usually reply within minutes.",
  primaryLabel = "Get a free review",
  secondary = SEE_PRICES,
}: Props) {
  return (
    <section className="cta-band">
      <div className="container cta-inner">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="cta-actions">
          <a className="btn btn-light" href={whatsappHref} target="_blank" rel="noopener">
            {primaryLabel}
          </a>
          <Link className="btn btn-ghost-dark" href={secondary.href}>
            {secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
