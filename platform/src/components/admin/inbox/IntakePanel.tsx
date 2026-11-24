"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { addPostersAction } from "@/app/(admin)/admin/(signed-in)/inbox/actions";
import { Icon } from "@/components/icons/Icon";
import { POSTER_SIZE, shrinkImage } from "@/components/admin/jobs/shrink-image";
import { ADVERT_PDF_MAX_BYTES, ADVERT_PDF_TYPE } from "@/modules/jobs/poster";

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

// "Drop today's posters here": up to 30 images (shrunk in the browser) or PDF adverts, queued for reading
export function IntakePanel({ aiPretend, sampleFiles, tokens, onAdded }: Props) {
  const [source, setSource] = useState("Uploaded");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  const upload = (files: File[], from: string) => {
    const chosen = files
      .filter((file) => file.type.startsWith("image/") || file.type === ADVERT_PDF_TYPE)
      .slice(0, MAX);
    if (!chosen.length) {
      setError("Those files aren't posters. Choose images (JPG, PNG) or PDF adverts.");
      return;
    }
    const tooBig = chosen.find((file) => file.type === ADVERT_PDF_TYPE && file.size > ADVERT_PDF_MAX_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is over 4 MB. Send a smaller PDF, or a screenshot of it.`);
      return;
    }
    setError(null);
    startUpload(async () => {
      const images = chosen.filter((file) => file.type !== ADVERT_PDF_TYPE);
      const pdfs = chosen.filter((file) => file.type === ADVERT_PDF_TYPE);
      const small = await Promise.all(images.map((file) => shrinkImage(file, POSTER_SIZE)));
      // Shrunk images go a few at a time; each PDF goes on its own
      const batches = [
        ...Array.from({ length: Math.ceil(small.length / PER_REQUEST) }, (_, i) =>
          small.slice(i * PER_REQUEST, (i + 1) * PER_REQUEST),
        ),
        ...pdfs.map((pdf) => [pdf]),
      ];
      for (const batch of batches) {
        const data = new FormData();
        batch.forEach((file) => data.append("posters", file));
        data.set("source", from);
        const result = await addPostersAction(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      onAdded(chosen.length);
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

  // Ctrl+V anywhere on Bulk post adds the copied posters (e.g. "Copy image" in WhatsApp Web), except
  // while typing in a box or with a job open
  const latest = useRef({ upload, source, uploading });
  useEffect(() => {
    latest.current = { upload, source, uploading };
  });
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector("dialog[open]")) return;
      const files = [...(event.clipboardData?.files ?? [])].filter(
        (file) => file.type.startsWith("image/") || file.type === ADVERT_PDF_TYPE,
      );
      if (!files.length || latest.current.uploading) return;
      event.preventDefault();
      // A pasted image has no real name: give it one Jay can recognise in the list
      const named = files.map((file, i) =>
        file.name && file.name !== "image.png"
          ? file
          : new File(
              [file],
              `Pasted poster ${new Date().toLocaleTimeString("en-GB")}${files.length > 1 ? ` (${i + 1})` : ""}.png`,
              {
                type: file.type,
              },
            ),
      );
      latest.current.upload(named, latest.current.source);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

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
          accept="image/*,application/pdf"
          multiple
          aria-label="Add posters"
          disabled={uploading}
          onChange={(event) => {
            upload([...(event.target.files ?? [])], source);
            event.target.value = "";
          }}
        />
        <Icon name="upload" />
        <strong>{uploading ? "Adding posters…" : "Drop today's posters or PDF adverts here"}</strong>
        <small>
          Flyers, screenshots, phone photos, or PDF adverts from WhatsApp (up to 4 MB each). Up to {MAX} at once. Or
          copy a poster and press <kbd>Ctrl</kbd>+<kbd>V</kbd> anywhere on this page.
        </small>
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
