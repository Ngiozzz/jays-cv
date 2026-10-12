"use client";

import { useRef, useState } from "react";
import { JobLogo } from "@/components/jobs/JobLogo";
import { companyKey } from "@/modules/jobs/companies";
import { LOGO_SIZE, shrinkImage } from "./shrink-image";

export type KnownCompany = { name: string; logoUrl: string | null };

type Props = { company: string; known: KnownCompany[]; error?: string };

// Beside "Company": shows the remembered logo for a company already used, or lets the team add one.
// A logo added here is saved to the company, so every later job for that company shows it too.
export function CompanyLogoField({ company, known, error }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const match = known.find((item) => companyKey(item.name) === companyKey(company));
  const shownUrl = chosen ?? match?.logoUrl ?? null;

  const choose = async (file: File | undefined) => {
    if (!file || !input.current) return;
    const small = await shrinkImage(file, LOGO_SIZE);
    const transfer = new DataTransfer();
    transfer.items.add(small);
    input.current.files = transfer.files;
    setChosen(URL.createObjectURL(small));
  };

  const hint = chosen
    ? "New logo: saved with the job, and used for this company from now on."
    : match?.logoUrl
      ? `Saved logo for ${match.name}.`
      : company.trim()
        ? "No logo yet: initials are shown instead. Add one if you have it."
        : "Type the company first.";

  return (
    <div className={error ? "f logo-field invalid" : "f logo-field"}>
      <span className="label">Company logo</span>
      <div className="logo-field-row">
        <JobLogo company={company || "?"} logoUrl={shownUrl} />
        <label className="btn btn-ghost btn-sm">
          {shownUrl ? "Replace logo" : "Add logo"}
          <input
            ref={input}
            type="file"
            name="companyLogo"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Logo image"
            onChange={(event) => void choose(event.target.files?.[0])}
          />
        </label>
      </div>
      <small>{hint}</small>
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
