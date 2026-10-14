import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { fileStore } from "@/lib/storage";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { sampleImageUrl } from "../sample-images";
import * as history from "./history";
import {
  describeSampleChanges,
  moveInOrder,
  newSampleSchema,
  sampleImagePath,
  sampleImageProblem,
  sampleRowSchema,
  sampleSlug,
  type SampleFields,
} from "./samples";
import * as repo from "./samples.repo";
import { fieldErrorsOf, type SaveResult } from "./save-result";

// Admin → Website content → Sample CVs (owner only). Each change records the samples as they
// were, so "Recent changes" can undo it.

export async function loadSamples(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  const samples = await repo.findAllSamples(member.tenant.id);
  return samples.map((sample) => ({
    ...rowOf(sample),
    beforeUrl: sampleImageUrl(sample, "before"),
    afterUrl: sampleImageUrl(sample, "after"),
  }));
}

export type AdminSample = Awaited<ReturnType<typeof loadSamples>>[number];

const rowOf = (sample: SampleFields): SampleFields => ({
  id: sample.id,
  role: sample.role,
  tag: sample.tag,
  caption: sample.caption,
  published: sample.published,
});

// What "Recent changes" keeps: every sample (with its place), or the sample that was added
type SamplesBefore =
  | { rows: (SampleFields & { sortOrder: number })[] }
  | { added: { id: string; beforeImage: string; afterImage: string } };

async function snapshot(tenantId: string) {
  const samples = await repo.findAllSamples(tenantId);
  return { samples, before: { rows: samples.map((s) => ({ ...rowOf(s), sortOrder: s.sortOrder })) } };
}

export async function restoreSamples(tx: history.Tx, before: unknown) {
  const saved = before as SamplesBefore;
  if ("added" in saved) {
    await repo.deleteSample(tx, saved.added.id);
    await removeImages([saved.added.beforeImage, saved.added.afterImage]);
    return;
  }
  for (const { id, ...data } of saved.rows) await repo.updateSample(tx, id, data);
}

const removeImages = (paths: string[]) =>
  Promise.all(paths.map((path) => fileStore.remove("sample-cvs", path).catch(() => {})));

export async function saveSamples(member: CurrentMember, rows: unknown[]): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = z.array(sampleRowSchema).safeParse(rows);
  if (!parsed.success) {
    // Row errors go next to their own input, e.g. "role-<sample id>"
    const idAt = (index: unknown) => (rows[Number(index)] as { id?: string } | undefined)?.id ?? "";
    const fieldErrors = Object.fromEntries(
      parsed.error.issues.map((issue) => [`${String(issue.path[1])}-${idAt(issue.path[0])}`, issue.message]),
    );
    return { ok: false, fieldErrors };
  }
  const tenantId = member.tenant.id;
  const { samples, before } = await snapshot(tenantId);
  const byId = new Map(parsed.data.map((row) => [row.id, row]));
  if (samples.some((sample) => !byId.has(sample.id)))
    return { ok: false, fieldErrors: { form: "The samples changed meanwhile. Reload the page and try again." } };
  const after = samples.map((sample) => byId.get(sample.id)!);
  const changes = describeSampleChanges(samples.map(rowOf), after);
  if (changes.length === 0) return { ok: true, message: "Nothing changed." };
  const summary = `Sample CVs: ${changes.join(", ")}`;
  await history.inTransaction(tenantId, async (tx) => {
    for (const { id, ...data } of after) await repo.updateSample(tx, id, data);
    await history.recordChange(tx, tenantId, { section: "samples", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}

export async function moveSample(
  member: CurrentMember,
  sampleId: string,
  direction: "earlier" | "later",
): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const tenantId = member.tenant.id;
  const { samples, before } = await snapshot(tenantId);
  const ids = samples.map((sample) => sample.id);
  const order = moveInOrder(ids, sampleId, direction);
  if (order === ids) return { ok: true, message: "Nothing changed." };
  const moved = samples.find((sample) => sample.id === sampleId)!;
  const summary = `moved "${moved.role}" ${direction}`;
  await history.inTransaction(tenantId, async (tx) => {
    await repo.setOrder(tx, order);
    await history.recordChange(tx, tenantId, { section: "samples", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}

export async function addSample(
  member: CurrentMember,
  raw: unknown,
  images: { before: File | null; after: File | null },
): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = newSampleSchema.safeParse(raw);
  const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);
  for (const side of ["before", "after"] as const) {
    const problem = sampleImageProblem(images[side]);
    if (problem) fieldErrors[side] = problem;
  }
  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const tenantId = member.tenant.id;
  const random = () => randomBytes(12).toString("hex");
  const paths = { before: "", after: "" };
  for (const side of ["before", "after"] as const) {
    const file = images[side]!;
    paths[side] = sampleImagePath(tenantId, side, file.type, random());
    await fileStore.put("sample-cvs", paths[side], new Uint8Array(await file.arrayBuffer()), file.type);
  }

  const samples = await repo.findAllSamples(tenantId);
  const summary = `added the "${parsed.data.role}" sample (unpublished)`;
  try {
    await history.inTransaction(tenantId, async (tx) => {
      const sample = await repo.createSample(tx, tenantId, {
        ...parsed.data,
        slug: sampleSlug(parsed.data.role, random().slice(0, 6)),
        beforeImage: paths.before,
        afterImage: paths.after,
        sortOrder: Math.max(-1, ...samples.map((s) => s.sortOrder)) + 1,
      });
      const before: SamplesBefore = {
        added: { id: sample.id, beforeImage: paths.before, afterImage: paths.after },
      };
      await history.recordChange(tx, tenantId, { section: "samples", summary, before, changedById: member.id });
    });
  } catch (error) {
    // Nothing was saved, so the uploaded images go too
    await removeImages([paths.before, paths.after]);
    throw error;
  }
  return { ok: true, message: `Saved: ${summary}. Check it, then tick Published.` };
}
