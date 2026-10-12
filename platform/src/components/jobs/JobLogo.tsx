import type { CSSProperties } from "react";
import { companyHue, companyInitials } from "@/modules/jobs/jobs.rules";

type Props = { company: string; logoUrl?: string | null };

// The employer's logo, or a coloured square with their initials when no logo has been added yet
// (the colour is fixed per company name, so a company always looks the same)
export function JobLogo({ company, logoUrl }: Props) {
  if (logoUrl) {
    return (
      <div className="job-logo has-logo" aria-hidden="true">
        <img src={logoUrl} alt="" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="job-logo" style={{ "--h": companyHue(company) } as CSSProperties} aria-hidden="true">
      {companyInitials(company)}
    </div>
  );
}
