"use client";

import { useState, type FormEvent } from "react";
import { saveAboutAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import { shrinkImage } from "@/components/admin/jobs/shrink-image";
import { Icon } from "@/components/icons/Icon";
import { hasPlaceholders, ownerInitials } from "@/modules/content/admin/about";
import type { AdminAbout } from "@/modules/content/admin/about.service";
import { PhotoCropper } from "./PhotoCropper";
import { SaveBar, useSave } from "./useSave";

// The About page shows the photo in a 4:5 frame; 800 × 1000 is sharp there and quick on mobile data
const PHOTO_ASPECT = 4 / 5;
const PHOTO_WIDTH = 800;
// Phone photos are shrunk before cropping, so dragging stays smooth
const PICKED_SIZE = { maxSide: 2000, type: "image/jpeg" } as const;

// The About page: the owner's own words, photo and numbers, with a live preview. Nothing changes on
// the website until "Save & publish".
export function AboutForm({ about, businessName }: { about: AdminAbout; businessName: string }) {
  const save = useSave();
  const [page, setPage] = useState(about);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  // The photo as picked (before cropping), so it can be adjusted again; and the one being cropped now
  const [original, setOriginal] = useState<File | null>(null);
  const [cropping, setCropping] = useState<File | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  const text = (name: "lead" | "ownerName" | "ownerRole" | "story") => ({
    id: `ab-${name}`,
    name,
    value: page[name],
    onChange: (event: { target: { value: string } }) => setPage({ ...page, [name]: event.target.value }),
  });
  const setStat = (index: number, patch: Partial<AdminAbout["stats"][number]>) =>
    setPage({ ...page, stats: page.stats.map((stat, i) => (i === index ? { ...stat, ...patch } : stat)) });
  const cls = (name: string, full = false) =>
    ["f", full && "full", save.errors[name] && "invalid"].filter(Boolean).join(" ");

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    const small = await shrinkImage(file, PICKED_SIZE);
    setOriginal(small);
    setCropping(small);
  };

  const cropped = (file: File) => {
    setPhoto({ file, url: URL.createObjectURL(file) });
    setRemovePhoto(false);
    setCropping(null);
  };

  // Re-adjust: the photo picked earlier, or the one already on the website
  const adjustPhoto = async () => {
    if (original) return setCropping(original);
    if (!page.photoUrl) return;
    setLoadingPhoto(true);
    try {
      const blob = await (await fetch(page.photoUrl)).blob();
      const file = new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
      setOriginal(file);
      setCropping(file);
    } finally {
      setLoadingPhoto(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // The cropped photo, not the one picked
    form.delete("photo");
    if (photo) form.set("photo", photo.file);
    save.run(async () => {
      const result = await saveAboutAction(form);
      if (result.ok) setPhoto(null);
      return result;
    });
  };

  const shownPhoto = removePhoto ? null : (photo?.url ?? page.photoUrl);
  const placeholders = hasPlaceholders(page);

  return (
    <section className="panel editor-grid">
      <form className="panel-body" noValidate onSubmit={submit}>
        <h2 className="editor-title">About page</h2>
        {placeholders && (
          <p className="role-note">
            <Icon name="info" />
            <span>
              Replace everything in <b>[brackets]</b> with your own details. Until then, the page shows the brackets so
              nothing made-up looks real.
            </span>
          </p>
        )}
        {save.error("form")}
        <div className="fgrid">
          <div className={cls("lead", true)}>
            <label htmlFor="ab-lead">
              Intro <small>(under &ldquo;About Jay CVS&rdquo;)</small>
            </label>
            <textarea rows={3} maxLength={300} {...text("lead")} />
            {save.error("lead")}
          </div>
        </div>

        <h3 className="sub-title">You</h3>
        <div className="about-photo-edit">
          <span className="about-avatar about-thumb">
            {shownPhoto ? <img src={shownPhoto} alt="" /> : ownerInitials(page.ownerName, businessName)}
          </span>
          <div>
            <label className="btn btn-ghost btn-sm">
              <Icon name="upload" />
              {page.photoUrl || photo ? "Change photo" : "Add a photo"}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) => {
                  pickPhoto(event.target.files?.[0]);
                  // So picking the same photo again still opens the cropper
                  event.target.value = "";
                }}
              />
            </label>
            {shownPhoto && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={adjustPhoto} disabled={loadingPhoto}>
                <Icon name="image" />
                {loadingPhoto ? "Opening…" : "Adjust photo"}
              </button>
            )}
            {page.photoUrl && !photo && (
              <label className="inline-check">
                <input
                  type="checkbox"
                  name="removePhoto"
                  checked={removePhoto}
                  onChange={(event) => setRemovePhoto(event.target.checked)}
                />{" "}
                Remove the photo
              </label>
            )}
            <small className="hint-sm">A friendly, clear photo of you. Without one, your initials are shown.</small>
            {save.error("photo")}
          </div>
        </div>
        {cropping && (
          <PhotoCropper
            file={cropping}
            aspect={PHOTO_ASPECT}
            outputWidth={PHOTO_WIDTH}
            onDone={cropped}
            onCancel={() => setCropping(null)}
          />
        )}
        <div className="fgrid">
          <div className={cls("ownerName")}>
            <label htmlFor="ab-ownerName">Your name</label>
            <input type="text" maxLength={60} {...text("ownerName")} />
            {save.error("ownerName")}
          </div>
          <div className={cls("ownerRole")}>
            <label htmlFor="ab-ownerRole">Your role</label>
            <input type="text" maxLength={60} {...text("ownerRole")} />
            {save.error("ownerRole")}
          </div>
          <div className={cls("story", true)}>
            <label htmlFor="ab-story">
              Your story <small>(leave an empty line between paragraphs)</small>
            </label>
            <textarea rows={9} maxLength={3000} {...text("story")} />
            {save.error("story")}
          </div>
        </div>

        <h3 className="sub-title">Numbers</h3>
        <div className="stats-edit">
          {page.stats.map((stat, i) => (
            <div key={i}>
              <input
                type="text"
                name={`stat-value-${i}`}
                value={stat.value}
                onChange={(event) => setStat(i, { value: event.target.value })}
                aria-label={`Number ${i + 1}`}
                maxLength={12}
              />
              <input
                type="text"
                name={`stat-label-${i}`}
                value={stat.label}
                onChange={(event) => setStat(i, { label: event.target.value })}
                aria-label={`Label ${i + 1}`}
                maxLength={30}
              />
              {save.error(`stats.${i}.value`)}
              {save.error(`stats.${i}.label`)}
            </div>
          ))}
        </div>
        <SaveBar save={save} label="Save & publish" />
      </form>

      <div className="panel-body preview-col">
        <p className="preview-label">Live preview</p>
        <div className="about-prev">
          <p>{page.lead}</p>
          <div className="about-prev-owner">
            <span className="about-avatar">
              {shownPhoto ? <img src={shownPhoto} alt="" /> : ownerInitials(page.ownerName, businessName)}
            </span>
            <span>
              <strong>{page.ownerName}</strong>
              <small>{page.ownerRole}</small>
            </span>
          </div>
          {page.story
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          <div className="home-prev-stats">
            {page.stats.map((stat, i) => (
              <div key={i}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <a className="hint-sm" href="/about" target="_blank" rel="noopener">
          Open the About page ↗
        </a>
      </div>
    </section>
  );
}
