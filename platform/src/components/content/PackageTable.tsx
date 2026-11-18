import Link from "next/link";
import { formatKes } from "@/lib/money";
import type { SitePackage } from "@/modules/content/content.service";
import { draftTimeLabel, orderHref, revisionsLabel } from "@/modules/content/packages";

type Props = { packages: SitePackage[] };

export function PackageTable({ packages }: Props) {
  return (
    <>
      <div className="table-wrap">
        <table className="pk-table">
          <thead>
            <tr>
              <th scope="col">Package</th>
              <th scope="col">Best for</th>
              <th scope="col">First draft</th>
              <th scope="col">Revisions</th>
              <th scope="col">Price</th>
              <th scope="col">
                <span className="sr-only">Order</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className={pkg.popular ? "main" : undefined}>
                <th scope="row">
                  {pkg.name}
                  {pkg.popular && <small>Chosen most often</small>}
                </th>
                <td className="best">{pkg.bestFor}</td>
                <td className="num">{draftTimeLabel(pkg.firstDraftHours)}</td>
                <td>{revisionsLabel(pkg)}</td>
                <td className="p num">{formatKes(pkg.price)}</td>
                <td>
                  <Link
                    className={pkg.popular ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                    href={orderHref(pkg.shortName)}
                  >
                    Order
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="plans-note">
        See everything each package includes on the{" "}
        <Link className="text-link" href="/pricing">
          pricing page
        </Link>
      </p>
    </>
  );
}
