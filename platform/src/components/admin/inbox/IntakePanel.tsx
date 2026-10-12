"use client";

import { useState, useTransition, type DragEvent } from "react";
import { addPostersAction } from "@/app/(admin)/admin/(signed-in)/inbox/actions";
import { Icon } from "@/components/icons/Icon";
import { POSTER_SIZE, shrinkImage } from "@/components/admin/jobs/shrink-image";

const SOURCES = [
  "Uploaded",
  "WhatsApp forward",
  "Facebook group",
  "LinkedIn screenshot",
  "Instagram",
  "Company website",
];
const MAX = 30;
// Several shrunk posters per request keeps each upload well under the server's size limit
const PER_REQUEST = 5;

type Props = {
  aiPretend: boolean;
  sampleFiles: string[];
  tokens: { remaining: number; postersLeft: number } | null;
  onAdded: (count: number) => void;
};

// "Drop today's posters here": up to 30 images, shrunk in the browser, then queued for reading
export function IntakePanel({ aiPretend, sampleFiles, tokens, onAdded }: Props) {
  const [source, setSource] = useState("Uploaded");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  const upload = (files: File[], from: string) => {
    const images = files.filter((file) => file.type.startsWith("image/")).slice(0, MAX);
    if (!images.length) {
      setError("Those files aren't images. Choose JPG or PNG posters.");
      return;
    }
    setError(null);
    startUpload(async () => {
      const small = await Promise.all(images.map((file) => shrinkImage(file, POSTER_SIZE)));
      for (let start = 0; start < small.length; start += PER_REQUEST) {
        const data = new FormData();
        small.slice(start, start + PER_REQUEST).forEach((file) => data.append("posters", file));
        data.set("source", from);
        const result = await addPostersAction(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      onAdded(small.length);
    });
  };

  const loadSamples = () =>
    startUpload(async () => {
      const files = await Promise.all(
        sampleFiles.map(async (name) => {
          const blob = await (await fetch(`/samples/inbox/${name}`)).blob();
          return new File([blob], name, { type: blob.type || "image/png" });
        }),
      );
      upload(files, "WhatsApp forward");
    });

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    upload([...event.dataTransfer.files], source);
  };

  return (
    <section className="intake">
      <label
        className={dragging ? "dropzone intake-drop drag" : "dropzone intake-drop"}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          aria-label="Add posters"
          disabled={uploading}
          onChange={(event) => {
            upload([...(event.target.files ?? [])], source);
            event.target.value = "";
          }}
        />
        <Icon name="upload" />
        <strong>{uploading ? "Adding posters…" : "Drop today's posters here"}</strong>
        <small>Flyers, screenshots from LinkedIn or Facebook, phone photos. Up to {MAX} at once.</small>
      </label>
      <div className="intake-side">
        <label className="intake-source">
          Where are they from?{" "}
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            {SOURCES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        {aiPretend && (
          <button type="button" className="btn btn-primary" onClick={loadSamples} disabled={uploading}>
            Load a sample batch ({sampleFiles.length} posters)
          </button>
        )}
        {tokens && (
          <p className="intake-est">
            <b>About 2,000 tokens per poster.</b> {tokens.remaining.toLocaleString("en-KE")} tokens left ≈{" "}
            {tokens.postersLeft.toLocaleString("en-KE")} posters.
          </p>
        )}
        <ul className="intake-points">
          <li>AI reads every poster{aiPretend ? " (pretend mode until the Claude key is added)" : ""}</li>
          <li>Scams, duplicates and missing deadlines are flagged</li>
          <li>Nothing goes live until someone approves it</li>
        </ul>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
