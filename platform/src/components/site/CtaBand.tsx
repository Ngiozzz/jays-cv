import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

type Props = { whatsappHref: string; secondary?: { href: string; label: string } };

const SEE_PRICES = { href: "/pricing", label: "See packages & prices" };

export function CtaBand({ whatsappHref, secondary = SEE_PRICES }: Props) {
  return (
    <section className="cta-band">
      <div className="container cta-inner">
        <h2>Ready for a CV that opens doors?</h2>
        <p>Send us your current CV on WhatsApp for a free review. We usually reply within 5 minutes.</p>
        <a className="btn btn-light btn-lg" href={whatsappHref} target="_blank" rel="noopener">
          <Icon name="whatsapp" size={20} />
          Get a free CV review
        </a>
        <Link className="btn btn-outline-light btn-lg" href={secondary.href}>
          {secondary.label}
        </Link>
      </div>
    </section>
  );
}
