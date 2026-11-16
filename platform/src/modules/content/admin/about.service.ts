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
  NO_OWNER_LINKS,
  describeAboutChanges,
  storedOwnerLinksSchema,
  storedTeamSchema,
  teamPhotoPath,
  type StoredAbout,
  type StoredTeamMember,
} from "./about";
import * as repo from "./about.repo";
import * as history from "./history";
import { fieldErrorsOf, type SaveResult } from "./save-result";

// Admin → Website content → About page (owner only). A save records the old page, so it can be
// undone. Replaced photos (the owner's and the team's) are kept in storage, so undoing a photo change
// still shows the old one.

export async function storedAbout(tenantId: string): Promise<StoredAbout> {
  const about = await repo.findAbout(tenantId);
  if (!about) return DEFAULT_ABOUT;
  const stats = homepageStatsSchema.parse(about.stats);
  // The form always has four number boxes
  const padded = Array.from({ length: ABOUT_STAT_COUNT }, (_, i) => stats[i] ?? { value: "", label: "" });
  return {
    ...about,
    stats: padded,
    ownerLinks: storedOwnerLinksSchema.parse(about.ownerLinks),
    team: storedTeamSchema.parse(about.team),
  };
}

const withPhotoUrl = <T extends { photo: string | null }>(item: T) => ({
  ...item,
  photoUrl: item.photo ? fileStore.publicUrl("about-photos", item.photo) : null,
});

// The About page with each photo's web address
export const aboutWithPhotoUrls = (about: StoredAbout) => ({
  ...withPhotoUrl(about),
  team: about.team.map(withPhotoUrl),
});

export async function loadAbout(member: CurrentMember) {
  assertCan(member, "editWebsiteContent");
  return aboutWithPhotoUrls(await storedAbout(member.tenant.id));
}

export type AdminAbout = Awaited<ReturnType<typeof loadAbout>>;

export async function restoreAbout(tx: history.Tx, before: unknown, tenantId: string) {
  // Changes saved before the team existed had none
  const about = before as StoredAbout;
  await repo.saveAbout(tx, tenantId, {
    ...about,
    ownerLinks: about.ownerLinks ?? NO_OWNER_LINKS,
    team: about.team ?? [],
  });
}

export async function saveAbout(
  member: CurrentMember,
  raw: unknown,
  photo: { file: File | null; remove: boolean },
  // By person: a new photo, and the ones whose current photo stays
  teamPhotos: { files: Map<string, File>; keep: Set<string> } = { files: new Map(), keep: new Set() },
): Promise<SaveResult> {
  assertCan(member, "editWebsiteContent");
  const parsed = aboutSchema.safeParse(raw);
  const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);
  const newPhoto = photo.file && photo.file.size > 0 ? photo.file : null;
  const problem = newPhoto && aboutPhotoProblem(newPhoto);
  if (problem) fieldErrors.photo = problem;
  const team = parsed.success ? parsed.data.team : [];
  const newTeamPhotos = new Map<string, File>();
  team.forEach((person, i) => {
    const file = teamPhotos.files.get(person.id);
    if (!file || file.size === 0) return;
    const teamProblem = aboutPhotoProblem(file);
    if (teamProblem) fieldErrors[`team.${i}.photo`] = teamProblem;
    else newTeamPhotos.set(person.id, file);
  });
  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const tenantId = member.tenant.id;
  const before = await storedAbout(tenantId);
  let photoPath = photo.remove ? null : before.photo;
  if (newPhoto) {
    photoPath = aboutPhotoPath(tenantId, newPhoto.type, randomBytes(12).toString("hex"));
    await fileStore.put("about-photos", photoPath, new Uint8Array(await newPhoto.arrayBuffer()), newPhoto.type);
  }
  // A kept photo is looked up in what's saved, never taken from the form
  const oldTeamPhotos = new Map(before.team.map((person) => [person.id, person.photo]));
  const savedTeam: StoredTeamMember[] = [];
  for (const person of team) {
    const file = newTeamPhotos.get(person.id);
    let teamPhoto = teamPhotos.keep.has(person.id) ? (oldTeamPhotos.get(person.id) ?? null) : null;
    if (file) {
      teamPhoto = teamPhotoPath(tenantId, file.type, randomBytes(12).toString("hex"));
      await fileStore.put("about-photos", teamPhoto, new Uint8Array(await file.arrayBuffer()), file.type);
    }
    savedTeam.push({ ...person, photo: teamPhoto });
  }
  const after: StoredAbout = { ...parsed.data, photo: photoPath, team: savedTeam };
  const changes = describeAboutChanges(before, after);
  if (changes.length === 0) return { ok: true, message: "Nothing changed." };
  const summary = `About page: ${changes.join(", ")}`;
  await history.inTransaction(tenantId, async (tx) => {
    await repo.saveAbout(tx, tenantId, after);
    await history.recordChange(tx, tenantId, { section: "about", summary, before, changedById: member.id });
  });
  return { ok: true, message: `Saved & published: ${summary}` };
}
