import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { formatKes } from "@/lib/money";
import type { SitePackage } from "@/modules/content/content.service";
import { draftTimeLabel, revisionsLabel } from "@/modules/content/packages";

// What each package includes. Feature rows are fixed copy from the preview, keyed by package short name;
// revisions, delivery and price come from the live packages. A package missing from a row shows "–".
type Cell = string | boolean;
const FEATURE_ROWS: { label: string; values: Record<string, Cell> }[] = [
  { label: "Professionally written CV", values: { Basic: true, Professional: true, Executive: true } },
  { label: "ATS-friendly format", values: { Basic: true, Professional: true, Executive: true } },
  { label: "Word and PDF files", values: { Basic: true, Professional: true, Executive: true } },
  {
    label: "Talk to your writer",
    values: { Basic: "On WhatsApp", Professional: "Phone call", Executive: "Phone or video call" },
  },
  { label: "Cover letter for your target role", values: { Professional: true, Executive: true } },
  { label: "LinkedIn profile revamp", values: { Executive: true } },
  { label: "Career coaching call", values: { Executive: "1 hour" } },
];

export function CompareTable({ packages }: { packages: SitePackage[] }) {
  const cellClass = (pkg: SitePackage, base?: string) =>
    [base, pkg.popular ? "col" : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="table-wrap">
      <table className="cmp">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Feature</span>
            </th>
            {packages.map((pkg) => (
              <th key={pkg.id} scope="col" className={cellClass(pkg)}>
                {pkg.name}
                <small>{formatKes(pkg.price)}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {packages.map((pkg) => {
                const value = row.values[pkg.shortName] ?? false;
                if (typeof value === "string")
                  return (
                    <td key={pkg.id} className={cellClass(pkg)}>
                      {value}
                    </td>
                  );
                return (
                  <td key={pkg.id} className={cellClass(pkg, value ? "yes" : "no")}>
                    {value ? <Icon name="check" size={16} /> : "Not included"}
                    {value && <span className="sr-only">Included</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <LiveRow label="Revisions" packages={packages} cellClass={cellClass} render={revisionsLabel} />
          <LiveRow
            label="First draft delivery"
            packages={packages}
            cellClass={cellClass}
            render={(pkg) => draftTimeLabel(pkg.firstDraftHours)}
          />
          <LiveRow
            label="Price"
            packages={packages}
            cellClass={cellClass}
            render={(pkg) => <b className="num">{formatKes(pkg.price)}</b>}
          />
        </tbody>
      </table>
    </div>
  );
}

type LiveRowProps = {
  label: string;
  packages: SitePackage[];
  cellClass: (pkg: SitePackage) => string | undefined;
  render: (pkg: SitePackage) => ReactNode;
};

function LiveRow({ label, packages, cellClass, render }: LiveRowProps) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {packages.map((pkg) => (
        <td key={pkg.id} className={cellClass(pkg)}>
          {render(pkg)}
        </td>
      ))}
    </tr>
  );
}
