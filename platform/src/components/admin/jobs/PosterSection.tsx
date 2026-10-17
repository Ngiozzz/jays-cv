"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type DragEvent } from "react";
import { addReadJobsAction } from "@/app/(admin)/admin/(signed-in)/inbox/actions";
import { readPosterAction } from "@/app/(admin)/admin/(signed-in)/jobs/actions";
import { AiProgress } from "@/components/ai/AiProgress";
import { Icon } from "@/components/icons/Icon";
import { findLinks, type LinkResult } from "@/modules/ai/links";
import type { JobInput } from "@/modules/jobs/jobs.schema";
import type { ReadPosterResult } from "@/modules/jobs/poster.service";
import { shrinkImage } from "./shrink-image";

type Props = {
  existingUrl: string | null;
  error?: string;
  aiPretend: boolean;
  onRead: (job: JobInput, unsure: string[], links: LinkResult[]) => void;
  // A new poster was chosen or this one removed: the last reading no longer applies
  onClear: () => void;
};

type Reading = Extract<ReadPosterResult, { ok: true }>;

// "1. Job poster": upload the advert image (saved with the job) and let the AI fill in the form from
// it, with the text that was posted with it (whose links are opened too)
export function PosterSection({ existingUrl, error, aiPretend, onRead, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [removed, setRemoved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [caption, setCaption] = useState("");
  const [reading, startReading] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // The scam check's warning after a reading (the fixed rules and the AI's opinion)
  const [scam, setScam] = useState<{ level: string; text: string; more: string } | null>(null);
  // The last reading, and which of its jobs is in the form (a poster can list several)
  const [result, setResult] = useState<Reading | null>(null);
  const [chosen, setChosen] = useState(0);
  const [sent, setSent] = useState<"no" | "sending" | "done">("no");
  const [sendError, setSendError] = useState<string | null>(null);
  const links = findLinks(caption).length;

  const forget = () => {
    setMessage(null);
    setScam(null);
    setResult(null);
    setSent("no");
    setSendError(null);
    onClear();
  };

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
    forget();
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
    forget();
  };

  const read = () => {
    const file = input.current?.files?.[0];
    if (!file) {
      setMessage({ tone: "error", text: "Choose the poster again to read it (saved posters can't be re-read yet)." });
      return;
    }
    const data = new FormData();
    data.set("poster", file);
    data.set("caption", caption);
    startReading(async () => {
      const outcome = await readPosterAction(data);
      if (!outcome.ok) {
        setMessage({ tone: "error", text: outcome.error });
        return;
      }
      setResult(outcome);
      setChosen(0);
      setSent("no");
      setSendError(null);
      onRead(outcome.jobs[0].job, outcome.jobs[0].unsure, outcome.links);
      setScam(outcome.scam);
      setMessage({
        tone: "ok",
        text: outcome.pretend
          ? "Pretend mode: filled in a sample advert. Real reading starts once the Claude API key is added."
          : outcome.jobs.length > 1
            ? `This poster lists ${outcome.jobs.length} jobs. Each one becomes its own job: see below.`
            : "Details filled in. The list below shows what was found, what's missing and what to check.",
      });
    });
  };

  const fillWith = (index: number) => {
    if (!result) return;
    setChosen(index);
    onRead(result.jobs[index].job, result.jobs[index].unsure, result.links);
  };

  // The jobs not in the form wait in Bulk post, already read (no second reading)
  const sendOthers = async () => {
    const file = input.current?.files?.[0];
    if (!result || !file) return;
    setSent("sending");
    setSendError(null);
    const data = new FormData();
    data.set("poster", file);
    data.set(
      "payload",
      JSON.stringify({
        caption,
        links: result.links,
        advert: result.advert,
        jobs: result.jobs.filter((_, index) => index !== chosen),
      }),
    );
    const outcome = await addReadJobsAction(data);
    if (outcome.ok) setSent("done");
    else {
      setSent("no");
      setSendError(outcome.error);
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    void takeFile(event.dataTransfer.files[0]);
  };

  const others = result ? result.jobs.length - 1 : 0;

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
            <label className="caption-field">
              <span>
                Text that came with the poster <small className="optional">(optional)</small>
              </span>
              <textarea
                rows={4}
                value={caption}
                maxLength={5000}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Paste the WhatsApp or LinkedIn caption, with its links. The AI reads it and the company pages the links open."
              />
              {links > 0 && (
                <small>
                  {links} link{links > 1 ? "s" : ""} found: the AI will open {links > 1 ? "them" : "it"} too.
                </small>
              )}
            </label>
            <button type="button" className="btn btn-ai" onClick={read} disabled={reading}>
              <Icon name="sparkle" />
              {reading ? "Reading the poster…" : result ? "Read again" : "Read poster & fill in details"}
            </button>
            <AiProgress
              active={reading}
              seconds={10 + 4 * links}
              steps={[
                "Sending the poster",
                ...(links ? ["Opening the company's pages"] : []),
                "Reading the text",
                "Filling in the details",
                "Checking for scam signs",
              ]}
            />
            <p>
              Fills in the title, company, location, deadline and how to apply. Always check the details before
              publishing.{aiPretend ? " (AI is in pretend mode until the Claude API key is added.)" : ""}
            </p>
            {message && (
              <div className={message.tone === "ok" ? "ai-result" : "ai-result error"} role="status">
                <span>{message.text}</span>
              </div>
            )}
            {result && others > 0 && (
              <div className="poster-jobs">
                <p>The form has this one (click another to switch):</p>
                <ul>
                  {result.jobs.map((read, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        className={index === chosen ? "poster-job is-sel" : "poster-job"}
                        aria-pressed={index === chosen}
                        onClick={() => fillWith(index)}
                        disabled={sent !== "no"}
                      >
                        {index + 1}. {read.job.title}
                      </button>
                    </li>
                  ))}
                </ul>
                {sent === "done" ? (
                  <p className="poster-jobs-done">
                    ✓ The other {others} {others > 1 ? "are" : "is"} waiting in{" "}
                    <Link href="/admin/inbox">Bulk post</Link>, already read. Publish this one here.
                  </p>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={sendOthers} disabled={sent !== "no"}>
                    {sent === "sending" ? "Adding…" : `Put the other ${others} in Bulk post to check and publish`}
                  </button>
                )}
                {sendError && (
                  <p className="field-error" role="alert">
                    {sendError}
                  </p>
                )}
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
