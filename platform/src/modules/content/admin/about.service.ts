import "server-only";
import { randomBytes } from "node:crypto";
import { fileStore } from "@/lib/storage";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { homepageStatsSchema } from "../content.schema";
import {
  ABOUT_STAT_COUNT,
  aboutPhotoPath,
  aboutPhotoProblem,
  aboutSchema,
  DEFAULT_ABOUT,
  describeAboutChanges,
  type StoredAbout,
} from "./about";
import * as repo from "./about.repo";
import * as history from "./history";
import { fieldErrorsOf, type SaveResult } from "./save-result";

// Admin → Website content → About page (owner only). A save records the old page, so it can be
// undone. Replaced photos are kept in storage, so undoing a photo change still shows the old one.

export async function storedAbout(tenantId: string): Promise<StoredAbout> {
  const about = await repo.findAbout(tenantId);
  if (!about) return DEFAULT_ABOUT;
  const stats = homepageStatsSchema.parse(about.stats);
  // The form always has four number boxes
  const padded = Array.from({ length: ABOUT_STAT_COUNT }, (_, i) => stats[i] ?? { value: "", label: "" });
  return { ...about, stats: padded };
}

export async function loadAbout(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  const about = await storedAbout(member.tenant.id);
  return { ...about, photoUrl: about.photo ? fileStore.publicUrl("about-photos", about.photo) : null };
}

export type AdminAbout = Awaited<ReturnType<typeof loadAbout>>;

export async function restoreAbout(tx: history.Tx, before: unknown, tenantId: string) {
  await repo.saveAbout(tx, tenantId, before as StoredAbout);
}

export async function saveAbout(
  member: CurrentMember,
  raw: unknown,
  photo: { file: File | null; remove: boolean },
): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = aboutSchema.safeParse(raw);
  const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);
  const newPhoto = photo.file && photo.file.size > 0 ? photo.file : null;
  const problem = newPhoto && aboutPhotoProblem(newPhoto);
  if (problem) fieldErrors.photo = problem;
  if (!parsed.success || problem) return { ok: false, fieldErrors };

  const tenantId = member.tenant.id;
  const before = await storedAbout(tenantId);
  let photoPath = photo.remove ? null : before.photo;
  if (newPhoto) {
    photoPath = aboutPhotoPath(tenantId, newPhoto.type, randomBytes(12).toString("hex"));
    await fileStore.put("about-photos", photoPath, new Uint8Array(await newPhoto.arrayBuffer()), newPhoto.type);
  }
  const after: StoredAbout = { ...parsed.data, photo: photoPath };
  const changes = describeAboutChanges(before, after);
  if (changes.length === 0) return { ok: true, message: "Nothing changed." };
  const summary = `About page: ${changes.join(", ")}`;
  await history.inTransaction(tenantId, async (tx) => {
    await repo.saveAbout(tx, tenantId, after);
    await history.recordChange(tx, tenantId, { section: "about", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}
