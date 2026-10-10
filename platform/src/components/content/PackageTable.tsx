import Link from "next/link";
import { formatKes } from "@/lib/money";
import { whatsappLink } from "@/modules/content/contact";
import type { SitePackage } from "@/modules/content/content.service";
import { draftTimeLabel, packageOrderMessage, revisionsLabel } from "@/modules/content/packages";

type Props = { packages: SitePackage[]; whatsapp: string };

export function PackageTable({ packages, whatsapp }: Props) {
  return (
    <>
      <div className="table-wrap">
        <table className="compare package-table">
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
              <tr key={pkg.id} className={pkg.popular ? "row-featured" : undefined}>
                <th scope="row">
                  <span>{pkg.name}</span>
                  {pkg.popular && (
                    <>
                      {" "}
                      <span className="mini-badge">Popular</span>
                    </>
                  )}
                </th>
                <td>{pkg.bestFor}</td>
                <td>{draftTimeLabel(pkg.firstDraftHours)}</td>
                <td>{revisionsLabel(pkg)}</td>
                <td>
                  <strong>{formatKes(pkg.price)}</strong>
                </td>
                <td>
                  <a
                    className="btn btn-primary btn-sm"
                    href={whatsappLink(whatsapp, packageOrderMessage(pkg.shortName))}
                    target="_blank"
                    rel="noopener"
                  >
                    Order
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pricing-note">
        <Link href="/pricing">Compare everything included in each package →</Link>
      </p>
    </>
  );
}
