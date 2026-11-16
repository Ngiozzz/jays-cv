"use client";

import { useState } from "react";
import { shrinkImage } from "@/components/admin/jobs/shrink-image";
import { Icon } from "@/components/icons/Icon";
import { MAX_TEAM, ownerInitials } from "@/modules/content/admin/about";
import type { AdminAbout } from "@/modules/content/admin/about.service";
import { PhotoCropper } from "./PhotoCropper";
import type { useSave } from "./useSave";

// Team photos are shown in a circle; 400 × 400 is sharp there
const TEAM_PHOTO_WIDTH = 400;
const PICKED_SIZE = { maxSide: 2000, type: "image/jpeg" } as const;

export type TeamRow = AdminAbout["team"][number] & {
  // A photo picked in this edit (already cropped), and whether the saved one stays
  newPhoto: { file: File; url: string } | null;
  keepPhoto: boolean;
};

export const teamRowsOf = (team: AdminAbout["team"]): TeamRow[] =>
  team.map((person) => ({ ...person, newPhoto: null, keepPhoto: true }));

export const teamRowPhoto = (row: TeamRow) => row.newPhoto?.url ?? (row.keepPhoto ? row.photoUrl : null);

const newId = () => crypto.randomUUID().slice(0, 13);

// "Your team": the writers the owner wants to credit on the About page. Add, edit, reorder and remove
// people here; the form's "Save & publish" saves them with the rest of the page.
export function AboutTeamEditor({
  rows,
  onChange,
  save,
  businessName,
}: {
  rows: TeamRow[];
  onChange: (rows: TeamRow[]) => void;
  save: ReturnType<typeof useSave>;
  businessName: string;
}) {
  const [cropping, setCropping] = useState<{ id: string; file: File } | null>(null);

  const change = (id: string, patch: Partial<TeamRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const move = (index: number, to: number) => {
    const next = [...rows];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };
  const add = () =>
    onChange([
      ...rows,
      {
        id: newId(),
        name: "",
        role: "CV writer",
        note: "",
        linkedin: null,
        photo: null,
        photoUrl: null,
        newPhoto: null,
        keepPhoto: false,
      },
    ]);

  const pickPhoto = async (id: string, file: File | undefined) => {
    if (!file) return;
    setCropping({ id, file: await shrinkImage(file, PICKED_SIZE) });
  };

  return (
    <>
      <h3 className="sub-title">Your team</h3>
      <p className="hint-sm">
        Give your writers credit: each person gets a card under &ldquo;Meet the team&rdquo;. The section stays hidden
        until you add someone.
      </p>
      {save.error("team")}
      <ol className="team-admin">
        {rows.map((row, i) => {
          const photo = teamRowPhoto(row);
          return (
            <li key={row.id}>
              <input type="hidden" name="team-id" value={row.id} />
              {row.keepPhoto && row.photo && !row.newPhoto && (
                <input type="hidden" name={`team-keepPhoto-${row.id}`} value="on" />
              )}
              <div className="about-photo-edit">
                <span className="about-avatar">
                  {photo ? <img src={photo} alt="" /> : ownerInitials(row.name || "?", businessName)}
                </span>
                <div>
                  <label className="btn btn-ghost btn-sm">
                    <Icon name="upload" />
                    {photo ? "Change photo" : "Add a photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(event) => {
                        pickPhoto(row.id, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {photo && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => change(row.id, { newPhoto: null, keepPhoto: false })}
                    >
                      Remove photo
                    </button>
                  )}
                  {save.error(`team.${i}.photo`)}
                </div>
              </div>
              <div className="fgrid">
                <div className={["f", save.errors[`team.${i}.name`] && "invalid"].filter(Boolean).join(" ")}>
                  <label htmlFor={`team-name-${row.id}`}>Name</label>
                  <input
                    id={`team-name-${row.id}`}
                    type="text"
                    name={`team-name-${row.id}`}
                    value={row.name}
                    onChange={(event) => change(row.id, { name: event.target.value })}
                    maxLength={60}
                  />
                  {save.error(`team.${i}.name`)}
                </div>
                <div className={["f", save.errors[`team.${i}.role`] && "invalid"].filter(Boolean).join(" ")}>
                  <label htmlFor={`team-role-${row.id}`}>Role</label>
                  <input
                    id={`team-role-${row.id}`}
                    type="text"
                    name={`team-role-${row.id}`}
                    value={row.role}
                    onChange={(event) => change(row.id, { role: event.target.value })}
                    maxLength={60}
                  />
                  {save.error(`team.${i}.role`)}
                </div>
                <div className={["f full", save.errors[`team.${i}.note`] && "invalid"].filter(Boolean).join(" ")}>
                  <label htmlFor={`team-note-${row.id}`}>
                    A line about them{" "}
                    <small>(optional, e.g. &ldquo;With us since 2019, writes our engineering CVs&rdquo;)</small>
                  </label>
                  <input
                    id={`team-note-${row.id}`}
                    type="text"
                    name={`team-note-${row.id}`}
                    value={row.note}
                    onChange={(event) => change(row.id, { note: event.target.value })}
                    maxLength={160}
                  />
                  {save.error(`team.${i}.note`)}
                </div>
                <div className={["f full", save.errors[`team.${i}.linkedin`] && "invalid"].filter(Boolean).join(" ")}>
                  <label htmlFor={`team-linkedin-${row.id}`}>
                    LinkedIn <small>(optional)</small>
                  </label>
                  <input
                    id={`team-linkedin-${row.id}`}
                    type="url"
                    inputMode="url"
                    name={`team-linkedin-${row.id}`}
                    value={row.linkedin ?? ""}
                    onChange={(event) => change(row.id, { linkedin: event.target.value })}
                    placeholder="https://linkedin.com/in/…"
                    maxLength={200}
                  />
                  {save.error(`team.${i}.linkedin`)}
                </div>
              </div>
              <div className="faq-admin-tools">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move ${row.name || `person ${i + 1}`} up`}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => move(i, i + 1)}
                  disabled={i === rows.length - 1}
                  aria-label={`Move ${row.name || `person ${i + 1}`} down`}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => onChange(rows.filter((other) => other.id !== row.id))}
                  aria-label={`Remove ${row.name || `person ${i + 1}`}`}
                >
                  <Icon name="trash" />
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="editor-actions">
        <button type="button" className="btn btn-ghost" onClick={add} disabled={rows.length >= MAX_TEAM}>
          <Icon name="plus" />
          Add a team member
        </button>
      </div>
      {cropping && (
        <PhotoCropper
          file={cropping.file}
          aspect={1}
          outputWidth={TEAM_PHOTO_WIDTH}
          onDone={(file) => {
            change(cropping.id, { newPhoto: { file, url: URL.createObjectURL(file) } });
            setCropping(null);
          }}
          onCancel={() => setCropping(null)}
        />
      )}
    </>
  );
}
