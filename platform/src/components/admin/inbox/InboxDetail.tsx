"use client";

import { useState } from "react";
import { findLinks } from "@/modules/ai/links";
import { AiProgress } from "@/components/ai/AiProgress";
import { AiReport } from "@/components/admin/jobs/AiReport";
import { Icon } from "@/components/icons/Icon";
import { readingReport } from "@/modules/ai/reading-report";
import type { Flag } from "@/modules/inbox/inbox.flags";
import type { InboxCard } from "@/modules/inbox/inbox.view";
import type { JobInput } from "@/modules/jobs/jobs.schema";
import type { KnownCompany } from "@/components/admin/jobs/CompanyLogoField";
import { JobCard } from "@/components/jobs/JobCard";
import { companyKey } from "@/modules/jobs/companies";
import { QuickForm, type ChosenLogo } from "./QuickForm";

export const DISCARD_LABEL: Record<string, string> = {
  scam: "Possible scam",
  duplicate: "Duplicate",
  expired: "Deadline passed",
  "not-a-job": "Not a job advert",
  other: "Other",
};

type Props = {
  card: InboxCard;
  job: JobInput | null;
  flags: Flag[];
  unsure: string[];
  position: { index: number; total: number };
  busy: boolean;
  onStep: (step: 1 | -1) => void;
  onChange: (job: JobInput) => void;
  onConfirm: (field: string) => void;
  companies: KnownCompany[];
  today: string;
  logo: ChosenLogo | null;
  onLogo: (logo: ChosenLogo) => void;
  onApprove: () => void;
  onDiscard: (reason: string) => void;
  onRestore: () => void;
  // Read the poster again with the text that was posted with it
  onReread: (caption: string) => Promise<void>;
  discardOpen: boolean;
  setDiscardOpen: (open: boolean) => void;
};

// The poster on one side, what the AI read on the other, and the decision
export function InboxDetail(props: Props) {
  const { card, job, flags, position } = props;
  const clean = flags.every((flag) => flag.level === "info");
  const nav = (
    <div className="d-nav">
      <button
        type="button"
        className="icon-btn"
        aria-label="Previous poster"
        disabled={position.index <= 0}
        onClick={() => props.onStep(-1)}
      >
        ‹
      </button>
      <span>
        {position.index + 1} of {position.total}
      </span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Next poster"
        disabled={position.index >= position.total - 1}
        onClick={() => props.onStep(1)}
      >
        ›
      </button>
    </div>
  );
  const poster = (
    <figure className={card.state === "reading" ? "d-poster scanning" : "d-poster"}>
      <img src={card.posterUrl} alt={`Job poster as received${job?.title ? `: ${job.title}` : ""}`} />
      <figcaption>
        {card.source} · {card.posterName} ·{" "}
        <a href={card.posterUrl} target="_blank" rel="noopener">
          Open full size
        </a>
      </figcaption>
    </figure>
  );

  if (card.state === "reading") {
    return (
      <>
        <div className="d-head">
          <div>
            <span className="ipill reading">Reading…</span>
            <small>The AI is reading this poster. Usually a few seconds.</small>
            <AiProgress
              active
              seconds={10 + 4 * findLinks(card.caption).length}
              steps={[
                "Waiting its turn",
                ...(findLinks(card.caption).length ? ["Opening the company's pages"] : []),
                "Reading the text",
                "Filling in the details",
                "Checking for scam signs",
              ]}
            />
          </div>
          {nav}
        </div>
        <div className="d-grid">
          {poster}
          <div className="d-skel">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}></span>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (card.state === "approved") {
    return (
      <>
        <div className="d-head">
          <div>
            <span className="ipill live">✓ Live on the website</span>
            {card.jobSlug && (
              <small>
                <a href={`/jobs/${card.jobSlug}`} target="_blank" rel="noopener">
                  View job page ↗
                </a>
              </small>
            )}
          </div>
          {nav}
        </div>
        <div className="d-grid">
          {poster}
          <div className="d-gone">
            <p>
              <strong>{job?.title}</strong>
              <br />
              {job?.company}
            </p>
            <p>Edit it any time under Jobs. It&apos;s in today&apos;s channel post below.</p>
          </div>
        </div>
      </>
    );
  }

  if (card.state === "discarded") {
    return (
      <>
        <div className="d-head">
          <div>
            <span className="ipill gone">Discarded: {DISCARD_LABEL[card.discardReason ?? "other"]}</span>
          </div>
          {nav}
        </div>
        <div className="d-grid">
          {poster}
          <div className="d-gone">
            <p>This poster was not published. Discarded posters are kept for a week.</p>
            <button type="button" className="btn btn-ghost" onClick={props.onRestore} disabled={props.busy}>
              Restore to inbox
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="d-head">
        <div>
          <span className={clean ? "ipill ready" : "ipill flagged"}>
            {clean ? "✓ Ready to approve" : "⚠ Needs a look"}
          </span>
          <small>
            {card.source}
            {card.part && ` · Job ${card.part.index} of ${card.part.total} from this poster`}
          </small>
        </div>
        {nav}
      </div>
      {card.readError && (
        <p className="d-note">
          <Icon name="info" />
          {card.readError}
        </p>
      )}
      <div className="d-flags">
        {flags.map((flag) => (
          <div key={flag.key} className={`d-flag ${flag.level}`}>
            <span className="d-flag-icon" aria-hidden="true">
              {flag.level === "info" ? "⏱" : "⚠"}
            </span>
            <div>
              <b>{flag.text}</b>
              <span>{flag.more}</span>
            </div>
            {["scam", "duplicate", "expired"].includes(flag.key) && (
              <div className="d-flag-acts">
                <button
                  type="button"
                  className={flag.key === "scam" ? "btn btn-danger btn-sm" : "btn btn-ghost btn-sm"}
                  onClick={() => props.onDiscard(flag.key)}
                  disabled={props.busy}
                >
                  Discard {flag.key === "scam" ? "as scam" : flag.key === "duplicate" ? "duplicate" : ""}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="d-grid">
        <div className="d-side">
          <p className="d-step-label">
            <span className="n">1</span>The poster
          </p>
          {poster}
          <CaptionBox key={card.id} card={card} onReread={props.onReread} />
          {job && (
            <div className="d-preview">
              <p className="preview-label">Live preview</p>
              <JobCard
                {...job}
                deadline={job.openEnded ? null : job.deadline}
                applyMethod={job.apply.method}
                today={props.today}
                logoUrl={
                  props.logo?.url ??
                  props.companies.find((c) => companyKey(c.name) === companyKey(job.company))?.logoUrl
                }
              />
            </div>
          )}
        </div>
        {job && (
          <div>
            {!card.readError && (
              <AiReport
                report={readingReport(job, props.unsure)}
                links={card.links}
                idOf={(key) => (key === "apply" ? "q-target" : key === "location" ? "q-county" : `q-${key}`)}
              />
            )}
            <QuickForm
              job={job}
              unsure={props.unsure}
              companies={props.companies}
              logo={props.logo}
              onChange={props.onChange}
              onConfirm={props.onConfirm}
              onLogo={props.onLogo}
            />
          </div>
        )}
      </div>
      {props.discardOpen ? (
        <DiscardChoice
          flags={flags}
          onCancel={() => props.setDiscardOpen(false)}
          onDiscard={props.onDiscard}
          busy={props.busy}
        />
      ) : (
        <div className="d-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => props.setDiscardOpen(true)}
            disabled={props.busy}
          >
            <Icon name="trash" />
            Discard <kbd>D</kbd>
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => props.onStep(1)}>
            Skip for now
          </button>
          <button type="button" className="btn btn-primary" onClick={props.onApprove} disabled={props.busy}>
            <Icon name="check" />
            {props.busy ? "Publishing…" : "Approve & publish"} <kbd>A</kbd>
          </button>
        </div>
      )}
    </>
  );
}

function DiscardChoice(props: { flags: Flag[]; busy: boolean; onCancel: () => void; onDiscard: (r: string) => void }) {
  const suggested = props.flags.find((flag) => flag.key in DISCARD_LABEL)?.key ?? "not-a-job";
  const [reason, setReason] = useState<string>(suggested);
  return (
    <fieldset className="reason-pick d-actions">
      <legend>Why discard it?</legend>
      {Object.entries(DISCARD_LABEL).map(([key, label]) => (
        <label key={key}>
          <input type="radio" name="reason" checked={reason === key} onChange={() => setReason(key)} /> {label}
        </label>
      ))}
      <button type="button" className="btn btn-ghost" onClick={props.onCancel}>
        Cancel
      </button>
      <button type="button" className="btn btn-danger" onClick={() => props.onDiscard(reason)} disabled={props.busy}>
        Discard
      </button>
    </fieldset>
  );
}

// The text posted with the poster (e.g. a WhatsApp caption with apply links). Changing it and
// reading again replaces the reading, and any jobs split off it that haven't been dealt with.
function CaptionBox({ card, onReread }: { card: InboxCard; onReread: (caption: string) => Promise<void> }) {
  const [caption, setCaption] = useState(card.caption);
  const [sending, setSending] = useState(false);
  const links = findLinks(caption).length;

  if (card.splitOff) {
    return card.caption ? (
      <div className="caption-field">
        <span>Text that came with the poster</span>
        <p className="caption-text">{card.caption}</p>
        <small>To change it, go to job 1 of this poster and read it again there.</small>
      </div>
    ) : null;
  }

  return (
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
      <span className="caption-actions">
        <small>
          {links > 0
            ? `${links} link${links > 1 ? "s" : ""}: the AI will open ${links > 1 ? "them" : "it"} too.`
            : "Reading again uses a little AI credit."}
        </small>
        <button
          type="button"
          className="btn btn-ai btn-sm"
          disabled={sending || (caption.trim() === card.caption.trim() && !card.readError)}
          onClick={async () => {
            setSending(true);
            await onReread(caption);
            setSending(false);
          }}
        >
          <Icon name="sparkle" />
          {sending ? "Sending…" : "Read again with this text"}
        </button>
      </span>
    </label>
  );
}
