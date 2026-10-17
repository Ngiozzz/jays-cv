"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { READING_FIELDS, SCAM_RISKS } from "@/modules/ai/poster-reading";
import {
  DISCARD_REASONS,
  MAX_CAPTION,
  addPosters,
  addReadJobs,
  approveInboxItem,
  confirmInboxField,
  discardInboxItem,
  readInboxItem,
  rereadInboxItem,
  restoreInboxItem,
  type DiscardReason,
} from "@/modules/inbox/inbox.service";
import { logoProblem } from "@/modules/jobs/companies";
import { saveCompanyLogo } from "@/modules/jobs/companies.service";
import { jobsTag } from "@/modules/jobs/jobs.public";
import { jobDraftSchema } from "@/modules/jobs/jobs.schema";
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

// "Read again" with the text that was posted with the poster
export async function rereadInboxItemAction(id: string, caption: string) {
  const member = await requirePermission("postJobs");
  return rereadInboxItem(member, id, String(caption ?? ""));
}

// What Post a job sends back when a poster listed several jobs: the ones it didn't fill in
const readJobsSchema = z.object({
  caption: z.string().max(MAX_CAPTION),
  links: z
    .array(
      z.object({
        url: z.string().max(2000),
        finalUrl: z.string().max(2000).nullable(),
        ok: z.boolean(),
        reason: z.string().max(200).nullable(),
      }),
    )
    .max(10),
  advert: z.object({ rawText: z.string().max(20_000), scamRisk: z.enum(SCAM_RISKS), scamReason: z.string().max(1000) }),
  jobs: z
    .array(z.object({ job: jobDraftSchema, unsure: z.array(z.enum(READING_FIELDS)) }))
    .min(1)
    .max(10),
});

export async function addReadJobsAction(form: FormData) {
  const member = await requirePermission("postJobs");
  const poster = form.get("poster");
  if (!(poster instanceof File) || !poster.size) return { ok: false as const, error: "Choose the poster again." };
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    payload = null;
  }
  const parsed = readJobsSchema.safeParse(payload);
  if (!parsed.success) return { ok: false as const, error: "Those jobs couldn't be added. Read the poster again." };
  const { caption, links, advert, jobs } = parsed.data;
  return addReadJobs(member, poster, caption, links, advert, jobs);
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
