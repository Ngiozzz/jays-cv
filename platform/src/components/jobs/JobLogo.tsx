import type { CSSProperties } from "react";
import { companyHue, companyInitials } from "@/modules/jobs/jobs.rules";

// The coloured initials square shown for each employer (its colour is fixed per company name)
export function JobLogo({ company }: { company: string }) {
  return (
    <div className="job-logo" style={{ "--h": companyHue(company) } as CSSProperties} aria-hidden="true">
      {companyInitials(company)}
    </div>
  );
}
