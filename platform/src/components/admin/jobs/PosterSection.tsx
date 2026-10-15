"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type DragEvent } from "react";
import { readPosterAction } from "@/app/(admin)/admin/(signed-in)/jobs/actions";
import { Icon } from "@/components/icons/Icon";
import type { JobInput } from "@/modules/jobs/jobs.schema";
import { shrinkImage } from "./shrink-image";

type Props = {
  existingUrl: string | null;
  error?: string;
  aiPretend: boolean;
  onRead: (job: JobInput) => void;
};

// "1. Job poster": upload the advert image (saved with the job) and let the AI fill in the form from it
export function PosterSection({ existingUrl, error, aiPretend, onRead }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [removed, setRemoved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reading, startReading] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // The scam check's warning after a reading (the fixed rules and the AI's opinion)
  const [scam, setScam] = useState<{ level: string; text: string; more: string } | null>(null);

  // Shrink the chosen image and put the smaller copy back into the form's file field
  const takeFile = async (file: File | undefined) => {
    if (!file || !input.current) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ tone: "error", text: "Please choose an image (JPG, PNG or WebP)." });
      return;
    }
    const small = await shrinkImage(file);
    const transfer = new DataTransfer();
    transfer.items.add(small);
    input.current.files = transfer.files;
    setPreview(URL.createObjectURL(small));
    setRemoved(false);
    setMessage(null);
    setScam(null);
  };

  // A file chosen in the moment before the page became interactive would otherwise be ignored
  useEffect(() => {
    const early = input.current?.files?.[0];
    if (early) void takeFile(early);
  }, []);

  const remove = () => {
    if (input.current) input.current.value = "";
    setPreview(null);
    setRemoved(Boolean(existingUrl));
    setMessage(null);
    setScam(null);
  };

  const read = () => {
    const file = input.current?.files?.[0];
    if (!file) {
      setMessage({ tone: "error", text: "Choose the poster again to read it (saved posters can't be re-read yet)." });
      return;
    }
    const data = new FormData();
    data.set("poster", file);
    startReading(async () => {
      const result = await readPosterAction(data);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      onRead(result.job);
      setScam(result.scam);
      setMessage({
        tone: "ok",
        text: result.pretend
          ? "Pretend mode: filled in a sample advert. Real reading starts once the Claude API key is added."
          : "Details filled in. Fields highlighted in yellow came from the poster: please check them.",
      });
    });
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    void takeFile(event.dataTransfer.files[0]);
  };

  return (
    <section className="form-section">
      <h2>
        <span className="n">1</span>Job poster <small className="optional">(optional)</small>
      </h2>
      <p className="hint">
        Upload the advert image and let the AI read it for you, or skip this and type the details below.
      </p>

      <label
        className={dragging ? "dropzone drag" : "dropzone"}
        hidden={Boolean(preview)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Icon name="image" />
        <strong>Drop the poster here, or click to choose</strong>
        <small>JPG or PNG, e.g. a screenshot from WhatsApp or Facebook</small>
        <input
          ref={input}
          type="file"
          name="poster"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Upload job poster"
          onChange={(event: ChangeEvent<HTMLInputElement>) => void takeFile(event.target.files?.[0])}
        />
      </label>
      {removed && <input type="hidden" name="removePoster" value="on" />}

      {preview && (
        <div className="poster-loaded">
          <div className={reading ? "poster-thumb scanning" : "poster-thumb"}>
            <img src={preview} alt="Job poster" />
          </div>
          <div className="poster-actions">
            <button type="button" className="btn btn-ai" onClick={read} disabled={reading}>
              <Icon name="sparkle" />
              {reading ? "Reading the poster…" : "Read poster & fill in details"}
            </button>
            <p>
              Fills in the title, company, location, deadline and how to apply. Always check the details before
              publishing.{aiPretend ? " (AI is in pretend mode until the Claude API key is added.)" : ""}
            </p>
            {message && (
              <div className={message.tone === "ok" ? "ai-result" : "ai-result error"} role="status">
                <span>{message.text}</span>
              </div>
            )}
            {scam && (
              <div className={scam.level === "critical" ? "ai-result error" : "ai-result"} role="alert">
                <span>
                  <strong>{scam.text}.</strong> {scam.more}
                </span>
              </div>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={remove}>
              <Icon name="trash" />
              Remove poster
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
