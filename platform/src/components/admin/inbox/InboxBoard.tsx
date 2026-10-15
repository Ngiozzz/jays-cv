"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  approveInboxItemAction,
  confirmInboxFieldAction,
  discardInboxItemAction,
  readInboxItemAction,
  restoreInboxItemAction,
} from "@/app/(admin)/admin/(signed-in)/inbox/actions";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/icons/Icon";
import { dailyDigest } from "@/modules/inbox/inbox.digest";
import { NEEDS_CONFIRMING, flagsFor, isClean, type Flag } from "@/modules/inbox/inbox.flags";
import type { InboxCard, InboxData } from "@/modules/inbox/inbox.view";
import type { JobInput } from "@/modules/jobs/jobs.schema";
import type { KnownCompany } from "@/components/admin/jobs/CompanyLogoField";
import { DISCARD_LABEL, InboxDetail } from "./InboxDetail";
import type { ChosenLogo } from "./QuickForm";
import { IntakePanel } from "./IntakePanel";

type View = "check" | "flagged" | "reading" | "approved" | "discarded";
const VIEWS: { key: View; label: string }[] = [
  { key: "check", label: "To check" },
  { key: "flagged", label: "Flagged" },
  { key: "reading", label: "Reading" },
  { key: "approved", label: "Approved today" },
  { key: "discarded", label: "Discarded" },
];
const EMPTY: Record<View, string> = {
  check: "Nothing ready to approve.",
  flagged: "Nothing flagged.",
  reading: "Nothing being read.",
  approved: "Nothing approved today yet.",
  discarded: "Nothing discarded this week.",
};
// The AI reads a few posters at once: quick, without flooding the server
const READ_AT_ONCE = 3;

type Props = {
  data: InboxData;
  companies: KnownCompany[];
  siteUrl: string;
  aiPretend: boolean;
  sampleFiles: string[];
};

// Blank lines typed into "Requirements" are dropped before publishing
const cleanLines = (list: string[]) => list.map((line) => line.trim()).filter(Boolean);
const tidy = (job: JobInput): JobInput => ({
  ...job,
  responsibilities: cleanLines(job.responsibilities),
  requirements: cleanLines(job.requirements),
});

// "Where did you find this advert?" starts as where the poster came from (unless just "Uploaded")
const withSource = (job: JobInput | null, source: string): JobInput | null =>
  job && !job.source && source !== "Uploaded" ? { ...job, source } : job;

export function InboxBoard({ data, companies, siteUrl, aiPretend, sampleFiles }: Props) {
  const router = useRouter();
  const { cards, liveJobs, today } = data;
  const [chosenView, setView] = useState<View>("check");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Corrections and "Looks right" ticks made on this screen, ahead of the next refresh
  const [edits, setEdits] = useState<Record<string, JobInput>>({});
  const [confirmed, setConfirmed] = useState<Record<string, string[]>>({});
  // Logos added on this screen, saved to the company when the job is approved
  const [logos, setLogos] = useState<Record<string, ChosenLogo>>({});
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const reading = useRef(new Set<string>());

  const jobOf = useCallback((card: InboxCard) => edits[card.id] ?? withSource(card.job, card.source), [edits]);
  const flagsOf = useCallback(
    (card: InboxCard): Flag[] => {
      const job = jobOf(card);
      if (card.state !== "check" || !job) return [];
      const earlier = cards.slice(0, cards.indexOf(card));
      return flagsFor(job, {
        today,
        rawText: card.rawText,
        aiScam: card.aiScam,
        unsure: card.unsure,
        checked: [...card.checked, ...(confirmed[card.id] ?? [])],
        liveJobs,
        earlierPosters: earlier
          .filter((other) => other.state === "check" && other.job)
          .map((other) => ({ title: jobOf(other)?.title ?? "", company: jobOf(other)?.company ?? "" })),
      });
    },
    [cards, confirmed, jobOf, liveJobs, today],
  );

  const viewOf = useCallback(
    (card: InboxCard): View | null => {
      if (card.state === "reading") return "reading";
      if (card.state === "check") return isClean(flagsOf(card)) ? "check" : "flagged";
      if (card.state === "approved") return card.decidedToday ? "approved" : null;
      return "discarded";
    },
    [flagsOf],
  );

  const lists = useMemo(() => {
    const grouped: Record<View, InboxCard[]> = { check: [], flagged: [], reading: [], approved: [], discarded: [] };
    for (const card of cards) {
      const key = viewOf(card);
      if (key) grouped[key].push(card);
    }
    return grouped;
  }, [cards, viewOf]);

  // When everything has been read, show what needs checking instead of an empty "Reading" tab
  const view: View =
    chosenView === "reading" && !lists.reading.length ? (lists.check.length ? "check" : "flagged") : chosenView;
  const list = lists[view];
  const selected = cards.find((card) => card.id === selectedId) ?? list[0] ?? null;
  const position = { index: selected ? Math.max(0, list.indexOf(selected)) : 0, total: list.length };

  const refresh = useCallback(() => router.refresh(), [router]);

  // ---------- reading: a few posters at a time, picked up again whenever the page opens ----------
  useEffect(() => {
    const waiting = lists.reading.filter((card) => !reading.current.has(card.id));
    const free = READ_AT_ONCE - reading.current.size;
    waiting.slice(0, Math.max(0, free)).forEach((card) => {
      reading.current.add(card.id);
      void readInboxItemAction(card.id).then((result) => {
        reading.current.delete(card.id);
        if (!result.ok) setNotice({ tone: "error", text: result.error });
        refresh();
      });
    });
  }, [lists.reading, refresh]);

  const go = useCallback(
    (step: 1 | -1) => {
      const next = list[position.index + step];
      if (next) setSelectedId(next.id);
      setDiscardOpen(false);
    },
    [list, position.index],
  );

  const nextAfter = (card: InboxCard) => {
    const index = list.indexOf(card);
    return list[index + 1] ?? list[index - 1] ?? null;
  };

  // ---------- decisions ----------
  const approve = useCallback(
    async (card: InboxCard, quiet = false) => {
      const job = jobOf(card);
      if (!job) return false;
      const risky = flagsOf(card).filter((flag) => NEEDS_CONFIRMING.includes(flag.key));
      if (!quiet && risky.length) {
        const question =
          risky[0].key === "scam"
            ? "This advert shows scam signs. Publishing it could hurt Jay CVS's name. Publish anyway?"
            : risky[0].key === "duplicate"
              ? `${risky[0].more} Only publish if it's a different job. Publish?`
              : `${risky[0].more} Publish anyway?`;
        if (!window.confirm(question)) return false;
      }
      setBusy(true);
      const logo = logos[card.id];
      const logoForm = logo ? new FormData() : null;
      if (logo) logoForm?.set("companyLogo", logo.file);
      const result = await approveInboxItemAction(card.id, tidy(job), logoForm);
      setBusy(false);
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        return false;
      }
      if (!quiet) {
        setNotice({ tone: "ok", text: `Published: ${job.title}. Added to today's channel post.` });
        setSelectedId(nextAfter(card)?.id ?? null);
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nextAfter reads the current list on purpose
    [flagsOf, jobOf, list, logos],
  );

  const discard = async (card: InboxCard, reason: string) => {
    setBusy(true);
    const job = jobOf(card);
    const result = await discardInboxItemAction(card.id, reason, job ? tidy(job) : null);
    setBusy(false);
    setDiscardOpen(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.error });
    setNotice({ tone: "ok", text: `Discarded: ${DISCARD_LABEL[reason] ?? reason}.` });
    setSelectedId(nextAfter(card)?.id ?? null);
    refresh();
  };

  const approveAllClean = async () => {
    if (!window.confirm(`Publish all ${lists.check.length} posters that are ready to approve?`)) return;
    let published = 0;
    for (const card of lists.check) if (await approve(card, true)) published++;
    setNotice({ tone: "ok", text: `Published ${published} job${published === 1 ? "" : "s"}.` });
    refresh();
  };

  const onApproveSelected = async () => {
    if (selected && (await approve(selected))) refresh();
  };

  // ---------- keyboard: J/K next/previous, A approve, D discard ----------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || event.metaKey || event.ctrlKey || busy) return;
      const key = event.key.toLowerCase();
      if (key === "j") go(1);
      else if (key === "k") go(-1);
      else if (key === "a" && selected?.state === "check") void onApproveSelected();
      else if (key === "d" && selected?.state === "check") setDiscardOpen(true);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const digestJobs = lists.approved
    .map((card) => ({ job: jobOf(card), slug: card.jobSlug }))
    .filter((entry): entry is { job: JobInput; slug: string } => Boolean(entry.job && entry.slug))
    .map(({ job, slug }) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      deadline: job.deadline,
      slug,
    }));
  const digest = dailyDigest(digestJobs, today, siteUrl);

  return (
    <>
      <IntakePanel
        aiPretend={aiPretend}
        sampleFiles={sampleFiles}
        tokens={data.tokens}
        onAdded={(count) => {
          setNotice({ tone: "ok", text: `${count} poster${count > 1 ? "s" : ""} added. Reading now…` });
          setView("reading");
          refresh();
        }}
      />

      {notice && (
        <p className={notice.tone === "ok" ? "notice" : "notice notice-error"} role="status">
          {notice.text}
        </p>
      )}

      <div className="inbox-bar">
        <nav className="tabs inbox-tabs" aria-label="Show">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              className={key === "flagged" && lists.flagged.length ? "tab-alert" : undefined}
              onClick={() => {
                setView(key);
                setSelectedId(null);
                setDiscardOpen(false);
              }}
            >
              {label} <span>{lists[key].length}</span>
            </button>
          ))}
        </nav>
        {view === "check" && lists.check.length > 1 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={approveAllClean} disabled={busy}>
            Approve all {lists.check.length} ready
          </button>
        )}
      </div>

      <div className="inbox-layout">
        <aside className="panel inbox-queue" aria-label="Posters">
          <ul className="queue">
            {list.length ? (
              list.map((card) => (
                <QueueItem
                  key={card.id}
                  card={card}
                  job={jobOf(card)}
                  flags={flagsOf(card)}
                  selected={card.id === selected?.id}
                  onSelect={() => {
                    setSelectedId(card.id);
                    setDiscardOpen(false);
                  }}
                />
              ))
            ) : (
              <li className="q-empty">{EMPTY[view]}</li>
            )}
          </ul>
        </aside>
        <section className="panel inbox-detail" aria-live="polite">
          {selected ? (
            <InboxDetail
              card={selected}
              job={jobOf(selected)}
              flags={flagsOf(selected)}
              unsure={selected.unsure.filter(
                (field) => !selected.checked.includes(field) && !(confirmed[selected.id] ?? []).includes(field),
              )}
              position={position}
              busy={busy}
              onStep={go}
              onChange={(job) => setEdits((current) => ({ ...current, [selected.id]: job }))}
              companies={companies}
              today={data.today}
              logo={logos[selected.id] ?? null}
              onLogo={(logo) => setLogos((current) => ({ ...current, [selected.id]: logo }))}
              onConfirm={(field) => {
                setConfirmed((current) => ({ ...current, [selected.id]: [...(current[selected.id] ?? []), field] }));
                void confirmInboxFieldAction(selected.id, field);
              }}
              onApprove={() => void onApproveSelected()}
              onDiscard={(reason) => void discard(selected, reason)}
              onRestore={async () => {
                await restoreInboxItemAction(selected.id);
                setView("check");
                refresh();
              }}
              discardOpen={discardOpen}
              setDiscardOpen={setDiscardOpen}
            />
          ) : (
            <EmptyDetail hasPosters={cards.length > 0} waiting={lists.check.length + lists.flagged.length} />
          )}
        </section>
      </div>

      <p className="kbd-help">
        Shortcuts: <kbd>J</kbd>/<kbd>K</kbd> next / previous · <kbd>A</kbd> approve &amp; publish · <kbd>D</kbd> discard
      </p>

      {digest && (
        <section className="panel digest">
          <div className="panel-head">
            <div>
              <h2>Today&apos;s WhatsApp channel post</h2>
              <p className="panel-sub">Every job approved today in one message, with links back to the website.</p>
            </div>
            <CopyButton text={digest} label="Copy post" />
          </div>
          <pre className="digest-text">{digest}</pre>
        </section>
      )}
    </>
  );
}

function QueueItem(props: {
  card: InboxCard;
  job: JobInput | null;
  flags: Flag[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { card, job, flags } = props;
  return (
    <li>
      <button
        type="button"
        className={props.selected ? "q-item is-sel" : "q-item"}
        aria-current={props.selected}
        onClick={props.onSelect}
      >
        <img src={card.posterUrl} alt="" loading="lazy" />
        <span className="q-main">
          {card.state === "reading" ? (
            <>
              <strong className="q-reading">Reading poster…</strong>
              <small>{card.source}</small>
            </>
          ) : (
            <>
              <strong>{job?.title || "Untitled poster"}</strong>
              <small>
                {job?.company || "—"} · {card.source}
              </small>
            </>
          )}
          <span className="q-flags">
            {card.state === "check" &&
              flags.map((flag) => (
                <span key={flag.key} className={`iflag ${flag.level}`}>
                  {flag.level === "critical" ? "⚠ " : flag.level === "warning" ? "! " : "⏱ "}
                  {flag.text}
                </span>
              ))}
            {card.state === "approved" && <span className="iflag live">✓ Live</span>}
            {card.state === "discarded" && (
              <span className="iflag gone">{DISCARD_LABEL[card.discardReason ?? "other"]}</span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function EmptyDetail({ hasPosters, waiting }: { hasPosters: boolean; waiting: number }) {
  return (
    <div className="d-empty">
      <Icon name="inbox" />
      <h2>{hasPosters ? (waiting ? "Pick a poster on the left" : "All caught up") : "No posters yet"}</h2>
      <p>
        {hasPosters
          ? waiting
            ? `${waiting} poster${waiting > 1 ? "s are" : " is"} still waiting.`
            : "Every poster has been approved or discarded. Copy today's channel post below."
          : "Drop today's posters above to get started."}
      </p>
    </div>
  );
}
