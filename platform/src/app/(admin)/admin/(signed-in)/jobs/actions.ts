"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { jobsTag } from "@/modules/jobs/jobs.public";
import { jobFormToInput } from "@/modules/jobs/jobs.schema";
import { removeJob, saveJob, setPublished, type FieldErrors } from "@/modules/jobs/jobs.service";
import { posterProblem } from "@/modules/jobs/poster";
import { attachPoster, readPoster, removePoster, type ReadPosterResult } from "@/modules/jobs/poster.service";
import { requirePermission } from "@/modules/team/current-member";

// Thin wrappers: check who is asking, hand over to the jobs services, then move on

export type JobFormState = { fieldErrors: FieldErrors } | null;

// An <input type="file"> left empty still sends a nameless, zero-byte file
const chosenFile = (value: FormDataEntryValue | null) => (value instanceof File && value.size > 0 ? value : null);

export async function saveJobAction(jobId: string | null, _previous: JobFormState, form: FormData) {
  const member = await requirePermission("postJobs");
  const poster = chosenFile(form.get("poster"));
  const problem = poster && posterProblem(poster);
  if (problem) return { fieldErrors: { poster: problem } };

  const intent = form.get("intent") === "publish" ? "publish" : "draft";
  const result = await saveJob(member, jobId, jobFormToInput(form), intent);
  if (!result.ok) return { fieldErrors: result.fieldErrors };

  if (poster) await attachPoster(member, result.id, poster);
  else if (form.get("removePoster") === "on") await removePoster(member, result.id);
  // The public jobs board shows the change straight away
  updateTag(jobsTag(member.tenant.id));
  redirect(`/admin/jobs/${result.id}?saved=${result.published ? "published" : "draft"}`);
}

export async function readPosterAction(form: FormData): Promise<ReadPosterResult> {
  const member = await requirePermission("postJobs");
  const poster = chosenFile(form.get("poster"));
  if (!poster) return { ok: false, error: "Choose the poster image first." };
  return readPoster(member, poster);
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
  updateTag(jobsTag(member.tenant.id));
  refresh();
  return null;
}

export async function deleteJobAction(jobId: string, from: "list" | "editor") {
  const member = await requirePermission("postJobs");
  await removeJob(member, jobId);
  updateTag(jobsTag(member.tenant.id));
  if (from === "editor") redirect("/admin/jobs?deleted=1");
  refresh();
}
