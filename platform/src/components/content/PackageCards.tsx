import Link from "next/link";
import { formatNumber } from "@/lib/money";
import { whatsappLink } from "@/modules/content/contact";
import type { SitePackage } from "@/modules/content/content.service";
import { forWhomSentence, packageOrderMessage } from "@/modules/content/packages";

type Props = { packages: SitePackage[]; whatsapp: string };

export function PackageCards({ packages, whatsapp }: Props) {
  return (
    <div className="pricing-grid">
      {packages.map((pkg) => (
        <article key={pkg.id} className={pkg.popular ? "price-card price-card-featured reveal" : "price-card reveal"}>
          {pkg.popular && <span className="ribbon">Most popular</span>}
          <h3>{pkg.name}</h3>
          <p className="price-desc">{forWhomSentence(pkg.bestFor)}</p>
          <p className="price">
            <span className="currency">KES</span> <span>{formatNumber(pkg.price)}</span>
          </p>
          <ul className="price-features">
            {pkg.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <a
            className={pkg.popular ? "btn btn-primary btn-block" : "btn btn-ghost btn-block"}
            href={whatsappLink(whatsapp, packageOrderMessage(pkg.shortName))}
            target="_blank"
            rel="noopener"
          >
            Choose {pkg.shortName}
          </a>
          <p className="price-pay">
            One-off payment · M-Pesa · <Link href="/pricing#payment">How to pay</Link>
          </p>
        </article>
      ))}
    </div>
  );
}
