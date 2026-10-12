"use server";

import { refresh, updateTag } from "next/cache";
import { logoProblem } from "@/modules/jobs/companies";
import { removeCompanyLogo, saveCompanyLogo } from "@/modules/jobs/companies.service";
import { jobsTag } from "@/modules/jobs/jobs.public";
import { requirePermission } from "@/modules/team/current-member";

export type LogoActionState = { error: string } | null;

export async function uploadLogoAction(companyId: string, _previous: LogoActionState, form: FormData) {
  const member = await requirePermission("postJobs");
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the logo image first." };
  const problem = logoProblem(file);
  if (problem) return { error: problem };
  await saveCompanyLogo(member, companyId, file);
  // Every job by this company shows the new logo on the website straight away
  updateTag(jobsTag(member.tenant.id));
  refresh();
  return null;
}

export async function removeLogoAction(companyId: string) {
  const member = await requirePermission("postJobs");
  await removeCompanyLogo(member, companyId);
  updateTag(jobsTag(member.tenant.id));
  refresh();
}
