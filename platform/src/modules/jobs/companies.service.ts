import "server-only";
import { randomBytes } from "node:crypto";
import { fileStore } from "@/lib/storage";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { companyKey, isLogoType, logoCoverage, logoPath, logoProblem } from "./companies";
import * as repo from "./companies.repo";

export const logoUrl = (path: string | null) => (path ? fileStore.publicUrl("company-logos", path) : null);

// Called when a job is saved: links the job to its remembered company (creating it the first time)
export async function companyIdFor(tenantId: string, name: string): Promise<string | null> {
  const key = companyKey(name);
  if (!key) return null;
  return (await repo.upsertCompany(tenantId, name.trim().replace(/\s+/g, " "), key)).id;
}

export async function saveCompanyLogo(member: CurrentMember, companyId: string, file: File): Promise<void> {
  assertCan(member, "postJobs");
  if (logoProblem(file) || !isLogoType(file.type)) throw new Error("Not a valid logo image");
  const tenantId = member.tenant.id;
  const company = await repo.findCompany(tenantId, companyId);
  if (!company) throw new Error("Company not found");

  const path = logoPath(tenantId, company.id, file.type, randomBytes(10).toString("hex"));
  await fileStore.put("company-logos", path, new Uint8Array(await file.arrayBuffer()), file.type);
  await repo.setCompanyLogo(tenantId, company.id, path);
  // A new file name each time, so phones never keep showing the old logo from their cache
  if (company.logoPath) await fileStore.remove("company-logos", company.logoPath);
}

export async function removeCompanyLogo(member: CurrentMember, companyId: string): Promise<void> {
  assertCan(member, "postJobs");
  const company = await repo.findCompany(member.tenant.id, companyId);
  if (!company?.logoPath) return;
  await repo.setCompanyLogo(member.tenant.id, company.id, null);
  await fileStore.remove("company-logos", company.logoPath);
}

export type CompanyRow = { id: string; name: string; logoUrl: string | null; jobCount: number };

// For the Company logos screen and the Post a job form: companies that post most come first
export async function listCompanies(member: CurrentMember): Promise<CompanyRow[]> {
  assertCan(member, "postJobs");
  const rows = await repo.findCompaniesWithJobCounts(member.tenant.id);
  return rows
    .map((row) => ({ id: row.id, name: row.name, logoUrl: logoUrl(row.logoPath), jobCount: row._count.jobs }))
    .sort((a, b) => b.jobCount - a.jobCount || a.name.localeCompare(b.name));
}

export function coverageOf(companies: CompanyRow[]) {
  return logoCoverage(companies.map((company) => ({ hasLogo: Boolean(company.logoUrl), jobCount: company.jobCount })));
}
