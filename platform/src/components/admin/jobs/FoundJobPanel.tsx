"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { HowToApply } from "@/components/jobs/HowToApply";
import { NEEDS_CONFIRMING } from "@/modules/inbox/inbox.flags";
import type { FoundJob } from "@/modules/job-sources/found.view";
import { deadlineLabel } from "@/modules/jobs/jobs.rules";

export const DISCARD_CHOICES = [
  { value: "not-a-job", label: "Not a job advert" },
  { value: "expired", label: "Deadline passed" },
  { value: "duplicate", label: "Duplicate" },
  { value: "scam", label: "Scam" },
  { value: "other", label: "Other" },
] as const;

type Props = {
  job: FoundJob;
  today: string;
  position: { index: number; total: number };
  busy: boolean;
  onStep: (step: 1 | -1) => void;
  onClose: () => void;
  onDecide: (decision: string) => void;
};

// One found job in full, as it would be published, with publish / discard right there
export function FoundJobPanel({ job, today, position, busy, onStep, onClose, onDecide }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<string>("not-a-job");
  const [showPdf, setShowPdf] = useState(false);
  const details = job.job;
  const waiting = job.status === "check";

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  // ← → (or J / K) move through the list while the panel is open
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "j") onStep(1);
      else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "k") onStep(-1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep]);

  const publish = () => {
    const risky = job.flags.filter((flag) => NEEDS_CONFIRMING.includes(flag.key));
    if (risky.length && !window.confirm(`${risky.map((flag) => flag.more).join(" ")} Publish anyway?`)) return;
    onDecide("publish");
  };

  const warnings = job.flags.filter((flag) => flag.level !== "info");
  const notes = job.flags.filter((flag) => flag.level === "info");
  const deadlineLine = details?.openEnded
    ? "Open until filled"
    : details?.deadline
      ? deadlineLabel(details.deadline, today).text
      : "No deadline given";

  return (
    <dialog ref={dialog} className="admin-dialog found-panel" onClose={onClose} aria-labelledby="found-panel-title">
      <div className="found-panel-head">
        <div>
          <p className="found-panel-from">
            From {job.source}
            {job.pageUrl && (
              <>
                {" · "}
                <a href={job.pageUrl} target="_blank" rel="noopener noreferrer">
                  Original advert ↗
                </a>
              </>
            )}
          </p>
          <h2 id="found-panel-title">{job.title}</h2>
          {job.company && <p className="found-panel-company">{job.company}</p>}
        </div>
        <div className="found-panel-nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onStep(-1)}
            disabled={position.index <= 0}
            title="Previous (←)"
          >
            ‹
          </button>
          <span>
            {position.index + 1} of {position.total}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onStep(1)}
            disabled={position.index >= position.total - 1}
            title="Next (→)"
          >
            ›
          </button>
          <button type="button" className="icon-btn" onClick={() => dialog.current?.close()} title="Close">
            <Icon name="x" />
          </button>
        </div>
      </div>

      <div className="found-panel-body">
        {(warnings.length > 0 || job.aiCheckReason || job.readError) && (
          <div className="found-panel-flags">
            {job.readError && <p className="found-flag critical">{job.readError}</p>}
            {warnings.map((flag) => (
              <p key={flag.key + flag.text} className={`found-flag ${flag.level}`}>
                <strong>{flag.text}:</strong> {flag.more}
              </p>
            ))}
            {job.aiCheckReason && (
              <p className={job.aiCheck === "job" ? "found-flag ok" : "found-flag info"}>
                <strong>AI check:</strong> {job.aiCheckReason}
              </p>
            )}
          </div>
        )}

        {details ? (
          <>
            <dl className="found-facts">
              <div>
                <dt>Location</dt>
                <dd>{details.location || "Not specified"}</dd>
              </div>
              <div>
                <dt>Job type</dt>
                <dd>
                  {details.type} · {details.workMode}
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{details.category || "Not set"}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{deadlineLine}</dd>
              </div>
              {details.salary && (
                <div>
                  <dt>Salary</dt>
                  <dd>{details.salary}</dd>
                </div>
              )}
            </dl>
            {notes.map((flag) => (
              <p key={flag.key + flag.text} className="found-flag info">
                {flag.more}
              </p>
            ))}

            {details.summary && (
              <section>
                <h3>About the role</h3>
                <p>{details.summary}</p>
              </section>
            )}
            {details.responsibilities.length > 0 && (
              <section>
                <h3>Responsibilities</h3>
                <ul>
                  {details.responsibilities.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            {details.requirements.length > 0 && (
              <section>
                <h3>Requirements</h3>
                <ul>
                  {details.requirements.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            <HowToApply apply={details.apply} jobTitle={details.title} deadlineLine={deadlineLine} />
            {details.tags.length > 0 && <p className="found-tags">Search tags: {details.tags.join(" · ")}</p>}
          </>
        ) : (
          <p className="hint-sm">This job hasn&apos;t been read yet, so there are no details to show.</p>
        )}

        {job.pdfUrl && (
          <section>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPdf(!showPdf)}>
              {showPdf ? "Hide the PDF advert" : "Show the PDF advert"}
            </button>
            {showPdf && <iframe className="d-pdf" src={`${job.pdfUrl}#view=FitH`} title="The PDF advert" />}
          </section>
        )}
      </div>

      <div className="found-panel-actions">
        {waiting ? (
          <>
            <div className="found-discard">
              <label className="sr-only" htmlFor="found-reason">
                Why discard
              </label>
              <select id="found-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
                {DISCARD_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-ghost" onClick={() => onDecide(reason)} disabled={busy}>
                <Icon name="trash" size={16} />
                Discard
              </button>
            </div>
            <Link className="btn btn-ghost" href={`/admin/inbox?item=${job.id}`}>
              <Icon name="edit" size={16} />
              Edit in Bulk post
            </Link>
            <button type="button" className="btn btn-primary" onClick={publish} disabled={busy || !details}>
              <Icon name="upload" size={16} />
              {busy ? "Working…" : "Publish"}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>
            Close
          </button>
        )}
      </div>
    </dialog>
  );
}
