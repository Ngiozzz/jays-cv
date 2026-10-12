"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { jobFormToInput } from "@/modules/jobs/jobs.schema";
import { removeJob, saveJob, setPublished, type FieldErrors } from "@/modules/jobs/jobs.service";
import { requirePermission } from "@/modules/team/current-member";

// Thin wrappers: check who is asking, hand over to the jobs service, then move on

export type JobFormState = { fieldErrors: FieldErrors } | null;

export async function saveJobAction(jobId: string | null, _previous: JobFormState, form: FormData) {
  const member = await requirePermission("postJobs");
  const intent = form.get("intent") === "publish" ? "publish" : "draft";
  const result = await saveJob(member, jobId, jobFormToInput(form), intent);
  if (!result.ok) return { fieldErrors: result.fieldErrors };
  redirect(`/admin/jobs/${result.id}?saved=${result.published ? "published" : "draft"}`);
}

export type RowActionState = { error: string } | null;

export async function setPublishedAction(
  jobId: string,
  publish: boolean,
  _previous: RowActionState,
): Promise<RowActionState> {
  const member = await requirePermission("postJobs");
  const problem = await setPublished(member, jobId, publish);
  if (problem) return { error: problem };
  refresh();
  return null;
}

export async function deleteJobAction(jobId: string, from: "list" | "editor") {
  const member = await requirePermission("postJobs");
  await removeJob(member, jobId);
  if (from === "editor") redirect("/admin/jobs?deleted=1");
  refresh();
}
