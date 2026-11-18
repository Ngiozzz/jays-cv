import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { formatNumber } from "@/lib/money";
import { orderHref } from "@/modules/content/packages";

// The fields a price card shows; the admin's live preview passes an unsaved package in the same shape
export type PackageCardData = {
  shortName: string;
  name: string;
  price: number;
  bestFor: string;
  features: string[];
  popular: boolean;
  firstDraftHours?: number;
};

type Props = { packages: (PackageCardData & { id: string })[]; showEta?: boolean };

export function PackageCards({ packages, showEta = false }: Props) {
  return (
    <div className="pricing-grid">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} showEta={showEta} />
      ))}
    </div>
  );
}

// "Order today, draft by Thu 19 Nov": the turnaround made concrete. Worked out in the browser, so a cached
// page still shows the right day.
function DraftBy({ hours }: { hours: number }) {
  return (
    <div className="eta">
      <span>Order today</span>
      <i />
      <b data-draft-hours={hours}>Draft within {hours} hours</b>
    </div>
  );
}

export function PackageCard({ pkg, showEta = false }: { pkg: PackageCardData; className?: string; showEta?: boolean }) {
  return (
    <article className={pkg.popular ? "price-card main" : "price-card"}>
      <div className="name">
        <h3>{pkg.name}</h3>
        {pkg.popular && <small>Chosen most often</small>}
      </div>
      <p className="for">For {pkg.bestFor.charAt(0).toLowerCase() + pkg.bestFor.slice(1)}</p>
      <p className="price">
        <small>KES</small>
        {formatNumber(pkg.price)}
      </p>
      {showEta && pkg.firstDraftHours ? <DraftBy hours={pkg.firstDraftHours} /> : <p className="once">One payment</p>}
      <ul className="price-features">
        {pkg.features.map((feature, i) => (
          <li key={`${i}-${feature}`}>
            <Icon name="check" size={16} />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        className={pkg.popular ? "btn btn-primary btn-block" : "btn btn-ghost btn-block"}
        href={orderHref(pkg.shortName)}
      >
        Choose {pkg.shortName}
      </Link>
      <p className="price-pay">
        One payment by M-Pesa ·{" "}
        <Link className="text-link" href="/pricing#payment">
          How to pay
        </Link>
      </p>
    </article>
  );
}
