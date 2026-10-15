"use server";

import { updateTag } from "next/cache";
import {
  DISCARD_REASONS,
  addPosters,
  approveInboxItem,
  confirmInboxField,
  discardInboxItem,
  readInboxItem,
  restoreInboxItem,
  type DiscardReason,
} from "@/modules/inbox/inbox.service";
import { logoProblem } from "@/modules/jobs/companies";
import { saveCompanyLogo } from "@/modules/jobs/companies.service";
import { jobsTag } from "@/modules/jobs/jobs.public";
import { requirePermission } from "@/modules/team/current-member";

// Thin wrappers: who is asking, then the inbox service. The screen refreshes itself afterwards.

const SOURCES = [
  "Uploaded",
  "WhatsApp forward",
  "Facebook group",
  "LinkedIn screenshot",
  "Instagram",
  "Company website",
];

export async function addPostersAction(form: FormData) {
  const member = await requirePermission("postJobs");
  const files = form.getAll("posters").filter((value): value is File => value instanceof File && value.size > 0);
  const source = String(form.get("source") ?? "");
  return addPosters(member, files, SOURCES.includes(source) ? source : "Uploaded");
}

export async function readInboxItemAction(id: string) {
  const member = await requirePermission("postJobs");
  return readInboxItem(member, id);
}

// A logo added on the screen comes as a form, saved to the company once the job is published
export async function approveInboxItemAction(id: string, job: unknown, logoForm: FormData | null) {
  const member = await requirePermission("postJobs");
  const logo = logoForm?.get("companyLogo");
  const file = logo instanceof File && logo.size > 0 ? logo : null;
  const logoIssue = file && logoProblem(file);
  if (logoIssue) return { ok: false as const, error: `Company logo: ${logoIssue}` };
  const result = await approveInboxItem(member, id, job);
  if (result.ok && file && result.companyId) await saveCompanyLogo(member, result.companyId, file);
  if (result.ok) updateTag(jobsTag(member.tenant.id));
  return result;
}

export async function discardInboxItemAction(id: string, reason: string, job: unknown) {
  const member = await requirePermission("postJobs");
  const why: DiscardReason = DISCARD_REASONS.includes(reason as DiscardReason) ? (reason as DiscardReason) : "other";
  return discardInboxItem(member, id, why, job);
}

export async function restoreInboxItemAction(id: string) {
  const member = await requirePermission("postJobs");
  return restoreInboxItem(member, id);
}

export async function confirmInboxFieldAction(id: string, field: string) {
  const member = await requirePermission("postJobs");
  return confirmInboxField(member, id, field);
}
