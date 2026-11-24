import type { SitePackage } from "@/modules/content/content.service";
import { draftTimeLabel, revisionsLabel } from "@/modules/content/packages";

// What each package includes, as the pricing cards list it: the same rows in the same order on every
// card, so the three line up side by side. Feature rows are fixed copy keyed by package short name;
// revisions and delivery come from the live packages. true: included, false: not, text: how.
export type Include = { label: string; value: boolean | string };

const FEATURE_ROWS: { label: string; values: Record<string, boolean | string> }[] = [
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

export function packageIncludes(pkg: SitePackage): Include[] {
  return [
    ...FEATURE_ROWS.map((row) => ({ label: row.label, value: row.values[pkg.shortName] ?? false })),
    { label: "Revisions", value: revisionsLabel(pkg) },
    { label: "First draft", value: `Within ${draftTimeLabel(pkg.firstDraftHours)}` },
  ];
}
