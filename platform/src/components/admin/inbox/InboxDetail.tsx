"use client";

import { useState, type ReactNode } from "react";
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

// One job opened from the Bulk post table, as a sheet from the right: the advert stays in view on the
// left while what the AI read is checked on the right, and the decision is always at the bottom
export function InboxDetail(props: Props) {
  const { card, job, flags, position } = props;
  const clean = flags.every((flag) => flag.level === "info");
  const nav = (
    <div className="d-nav">
      <button
        type="button"
        className="icon-btn"
        aria-label="Previous job"
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
        aria-label="Next job"
        disabled={position.index >= position.total - 1}
        onClick={() => props.onStep(1)}
      >
        ›
      </button>
    </div>
  );
  const original = <Original card={card} title={job?.title} />;

  if (card.state === "reading") {
    return (
      <Sheet
        status={<span className="ipill reading">Reading…</span>}
        sub="The AI is reading this advert. Usually a few seconds."
        nav={nav}
        source={original}
      >
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
        <div className="d-skel">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i}></span>
          ))}
        </div>
      </Sheet>
    );
  }

  if (card.state === "approved") {
    return (
      <Sheet
        status={<span className="ipill live">Live on the website</span>}
        sub={card.source}
        nav={nav}
        source={original}
      >
        <div className="d-gone">
          <p>
            <strong>{job?.title}</strong>
            <br />
            {job?.company}
          </p>
          <p>Edit it any time under Job board. It&apos;s in today&apos;s channel post.</p>
          {card.jobSlug && (
            <a className="btn btn-ghost" href={`/jobs/${card.jobSlug}`} target="_blank" rel="noopener">
              View the job page ↗
            </a>
          )}
        </div>
      </Sheet>
    );
  }

  if (card.state === "discarded") {
    return (
      <Sheet
        status={<span className="ipill gone">Discarded: {DISCARD_LABEL[card.discardReason ?? "other"]}</span>}
        sub={card.source}
        nav={nav}
        source={original}
      >
        <div className="d-gone">
          <p>This advert was not published. Discarded adverts are kept for a week.</p>
          <button type="button" className="btn btn-ghost" onClick={props.onRestore} disabled={props.busy}>
            Restore to inbox
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      status={
        <span className={clean ? "ipill ready" : "ipill flagged"}>{clean ? "Ready to approve" : "Needs a look"}</span>
      }
      sub={`${card.source}${card.part ? ` · Job ${card.part.index} of ${card.part.total} from this advert` : ""}`}
      nav={nav}
      source={
        <>
          {original}
          <CaptionBox key={card.id} card={card} onReread={props.onReread} />
        </>
      }
      actions={
        props.discardOpen ? (
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
        )
      }
    >
      {card.readError && (
        <p className="d-note">
          <Icon name="info" />
          {card.readError}
        </p>
      )}
      {flags.length > 0 && (
        <div className="d-flags">
          {flags.map((flag) => (
            <div key={flag.key} className={`d-flag ${flag.level}`}>
              <span className="d-flag-icon" aria-hidden="true" />
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
      )}
      {job && (
        <>
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
          <section className="d-step sheet-preview">
            <h3>
              <span className="n">6</span>How it will look
            </h3>
            <JobCard
              {...job}
              deadline={job.openEnded ? null : job.deadline}
              applyMethod={job.apply.method}
              today={props.today}
              logoUrl={
                props.logo?.url ?? props.companies.find((c) => companyKey(c.name) === companyKey(job.company))?.logoUrl
              }
            />
          </section>
        </>
      )}
    </Sheet>
  );
}

// The sheet's frame: a bar along the top, the advert on the left (it stays put while the right side
// scrolls), the work on the right, and the decision pinned to the bottom
function Sheet(props: {
  status: ReactNode;
  sub: string;
  nav: ReactNode;
  source: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="sheet">
      <header className="sheet-bar">
        <div className="sheet-status">
          {props.status}
          <small>{props.sub}</small>
        </div>
        {props.nav}
      </header>
      <div className="sheet-split">
        <aside className="sheet-source" aria-label="The advert as received">
          {props.source}
        </aside>
        <div className="sheet-work">{props.children}</div>
      </div>
      {props.actions && <footer className="sheet-actions">{props.actions}</footer>}
    </div>
  );
}

// The advert as it came in: a poster image, a PDF, or (from a job source) the web page it's on
function Original({ card, title }: { card: InboxCard; title?: string }) {
  const scanning = card.state === "reading" ? " scanning" : "";
  if (card.posterUrl)
    return (
      <figure className={`sheet-poster${scanning}`}>
        <div className="sheet-poster-frame">
          <img src={card.posterUrl} alt={`Job poster as received${title ? `: ${title}` : ""}`} />
        </div>
        <figcaption>
          <span>{card.posterName}</span>
          <a href={card.posterUrl} target="_blank" rel="noopener">
            Open full size ↗
          </a>
        </figcaption>
      </figure>
    );
  return (
    <figure className={`sheet-poster sheet-doc${scanning}`}>
      {card.pdfUrl ? (
        <div className="sheet-poster-frame">
          <iframe src={`${card.pdfUrl}#view=FitH&toolbar=0`} title="The PDF advert" loading="lazy" />
        </div>
      ) : (
        <div className="sheet-page">
          <Icon name="globe" />
          <b>{card.posterName}</b>
          <span>Found on {card.source}</span>
        </div>
      )}
      {card.aiCheck && card.aiCheckReason && (
        <p className={card.aiCheck === "job" ? "d-ai-check ok" : "d-ai-check"}>AI check: {card.aiCheckReason}</p>
      )}
      <figcaption>
        <span>{card.pdfUrl ? card.posterName : "Check the details against the original"}</span>
        {card.pdfUrl && (
          <a href={card.pdfUrl} target="_blank" rel="noopener noreferrer">
            Open the PDF ↗
          </a>
        )}
        {card.pageUrl && (
          <a href={card.pageUrl} target="_blank" rel="noopener noreferrer">
            Open the original advert ↗
          </a>
        )}
      </figcaption>
    </figure>
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
