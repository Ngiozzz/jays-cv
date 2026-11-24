import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { formatNumber } from "@/lib/money";
import { orderHref } from "@/modules/content/packages";
import { DraftByDate } from "./DraftByDate";
import type { Include } from "./package-includes";

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

type Props = {
  packages: (PackageCardData & { id: string })[];
  showEta?: boolean;
  // The pricing page: each card lists everything it includes, row for row with the others
  includes?: (pkg: PackageCardData & { id: string }) => Include[];
};

export function PackageCards({ packages, showEta = false, includes }: Props) {
  return (
    <div className={includes ? "pricing-grid is-compare" : "pricing-grid"}>
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} showEta={showEta} includes={includes?.(pkg)} />
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
      <DraftByDate hours={hours} />
    </div>
  );
}

type CardProps = { pkg: PackageCardData; showEta?: boolean; includes?: Include[] };

// With includes, the card spans one grid row per part (head, price, delivery, each include, button)
// so the rows of all three cards line up; see .pricing-grid.is-compare
const HEAD_ROWS = 4;
const FOOT_ROWS = 2;

export function PackageCard({ pkg, showEta = false, includes }: CardProps) {
  return (
    <article
      className={pkg.popular ? "price-card main" : "price-card"}
      style={includes ? { gridRow: `span ${HEAD_ROWS + includes.length + FOOT_ROWS}` } : undefined}
    >
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
      {includes ? (
        <ul className="price-includes" style={{ gridRow: `span ${includes.length}` }}>
          {includes.map((item) => (
            <li key={item.label} className={item.value === false ? "not" : undefined}>
              {item.value === false ? <span className="mark" aria-hidden="true" /> : <Icon name="check" size={16} />}
              <span>
                {item.label}
                {typeof item.value === "string" && <small>{item.value}</small>}
                {item.value === false && <span className="sr-only"> (not included)</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="price-features">
          {pkg.features.map((feature, i) => (
            <li key={`${i}-${feature}`}>
              <Icon name="check" size={16} />
              {feature}
            </li>
          ))}
        </ul>
      )}
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
