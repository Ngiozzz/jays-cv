import Link from "next/link";
import { formatNumber } from "@/lib/money";
import { forWhomSentence, orderHref } from "@/modules/content/packages";

// The fields a price card shows; the admin's live preview passes an unsaved package in the same shape
export type PackageCardData = {
  shortName: string;
  name: string;
  price: number;
  bestFor: string;
  features: string[];
  popular: boolean;
};

type Props = { packages: (PackageCardData & { id: string })[] };

export function PackageCards({ packages }: Props) {
  return (
    <div className="pricing-grid">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} className="reveal" />
      ))}
    </div>
  );
}

export function PackageCard({ pkg, className }: { pkg: PackageCardData; className?: string }) {
  const classes = ["price-card", pkg.popular && "price-card-featured", className].filter(Boolean).join(" ");
  return (
    <article className={classes}>
      {pkg.popular && <span className="ribbon">Most popular</span>}
      <h3>{pkg.name}</h3>
      <p className="price-desc">{forWhomSentence(pkg.bestFor)}</p>
      <p className="price">
        <span className="currency">KES</span> <span>{formatNumber(pkg.price)}</span>
      </p>
      <ul className="price-features">
        {pkg.features.map((feature, i) => (
          <li key={`${i}-${feature}`}>{feature}</li>
        ))}
      </ul>
      <Link
        className={pkg.popular ? "btn btn-primary btn-block" : "btn btn-ghost btn-block"}
        href={orderHref(pkg.shortName)}
      >
        Choose {pkg.shortName}
      </Link>
      <p className="price-pay">
        One-off payment · M-Pesa · <Link href="/pricing#payment">How to pay</Link>
      </p>
    </article>
  );
}
