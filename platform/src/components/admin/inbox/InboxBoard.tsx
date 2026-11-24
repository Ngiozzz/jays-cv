"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  approveInboxItemAction,
  confirmInboxFieldAction,
  discardInboxItemAction,
  readInboxItemAction,
  rereadInboxItemAction,
  restoreInboxItemAction,
} from "@/app/(admin)/admin/(signed-in)/inbox/actions";
import { ProgressBar } from "@/components/ai/AiProgress";
import { CopyButton } from "@/components/CopyButton";
import { AskForTokens } from "@/components/admin/AskForTokens";
import { Icon } from "@/components/icons/Icon";
import { dailyDigest } from "@/modules/inbox/inbox.digest";
import { NEEDS_CONFIRMING, flagsFor, isClean, type Flag } from "@/modules/inbox/inbox.flags";
import type { InboxCard, InboxData } from "@/modules/inbox/inbox.view";
import type { JobInput } from "@/modules/jobs/jobs.schema";
import type { KnownCompany } from "@/components/admin/jobs/CompanyLogoField";
import { formatDay } from "@/modules/jobs/jobs.rules";
import { DISCARD_LABEL, InboxDetail } from "./InboxDetail";
import type { ChosenLogo } from "./QuickForm";
import { IntakePanel } from "./IntakePanel";

type View = "check" | "flagged" | "reading" | "approved" | "discarded";
const VIEWS: { key: View; label: string }[] = [
  { key: "check", label: "Ready to publish" },
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

type Sort = "oldest" | "newest" | "closing" | "source";
type AiFilter = "" | "job" | "unsure" | "none";
const DISCARD_CHOICES = ["not-a-job", "expired", "duplicate", "scam", "other"] as const;

type Props = {
  data: InboxData;
  companies: KnownCompany[];
  siteUrl: string;
  aiPretend: boolean;
  sampleFiles: string[];
  // Opens on this item (from Jobs found: "Check in Bulk post")
  initialId?: string | null;
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

export function InboxBoard({ data, companies, siteUrl, aiPretend, sampleFiles, initialId = null }: Props) {
  const router = useRouter();
  const { liveJobs, today } = data;
  // Approve and discard show at once: the job leaves "To check" / "Flagged" before the page refreshes
  const [decided, setDecided] = useState<Record<string, "approved" | "discarded">>({});
  const cards = useMemo(
    () =>
      data.cards.map((card) => {
        const state = decided[card.id];
        return state && card.state !== state ? { ...card, state, decidedToday: true } : card;
      }),
    [data.cards, decided],
  );
  // "Drop today's posters here" folds away; open at the start only when there's nothing yet
  const [addOpen, setAddOpen] = useState(data.cards.length === 0);
  // The tabs stay in view while scrolling, just under the admin's top bar
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const top = document.querySelector<HTMLElement>(".admin-top");
    const bar = barRef.current;
    const root = document.documentElement;
    const measure = () => {
      // Only a header that stays pinned takes room at the top; the redesigned one scrolls away, and
      // counting it left a gap above the tabs that the rows showed through
      const pinned = top && ["sticky", "fixed"].includes(getComputedStyle(top).position);
      root.style.setProperty("--admin-top-h", `${pinned ? top.offsetHeight : 0}px`);
      root.style.setProperty("--inbox-bar-h", `${bar?.offsetHeight ?? 0}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (top) observer.observe(top);
    if (bar) observer.observe(bar);
    return () => observer.disconnect();
  }, []);
  const opening = initialId ? cards.find((card) => card.id === initialId) : undefined;
  const [chosenView, setView] = useState<View>(
    opening?.state === "reading" ? "reading" : opening?.state === "discarded" ? "discarded" : "check",
  );
  const [selectedId, setSelectedId] = useState<string | null>(opening?.id ?? null);
  // Corrections and "Looks right" ticks made on this screen, ahead of the next refresh
  const [edits, setEdits] = useState<Record<string, JobInput>>({});
  const [confirmed, setConfirmed] = useState<Record<string, string[]>>({});
  // Logos added on this screen, saved to the company when the job is approved
  const [logos, setLogos] = useState<Record<string, ChosenLogo>>({});
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const reading = useRef(new Set<string>());
  // The table: filters, sort, search and ticked rows
  const [source, setSource] = useState("");
  const [aiFilter, setAiFilter] = useState<AiFilter>("");
  const [sort, setSort] = useState<Sort>("oldest");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState<string>("not-a-job");
  const [bulk, setBulk] = useState<{ done: number; total: number; verb: string } | null>(null);

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
  const sources = useMemo(() => [...new Set(cards.map((card) => card.source))].sort(), [cards]);
  const list = useMemo(() => {
    const words = search.trim().toLowerCase();
    const kept = lists[view].filter((card) => {
      const job = jobOf(card);
      if (source && card.source !== source) return false;
      if (aiFilter && (aiFilter === "none" ? card.aiCheck : card.aiCheck !== aiFilter)) return false;
      if (words && !`${job?.title ?? ""} ${job?.company ?? ""} ${card.source}`.toLowerCase().includes(words))
        return false;
      return true;
    });
    if (sort === "newest") return [...kept].reverse();
    if (sort === "closing") {
      const due = (card: InboxCard) => {
        const job = jobOf(card);
        return job && !job.openEnded && job.deadline ? job.deadline : "9999";
      };
      return [...kept].sort((a, b) => due(a).localeCompare(due(b)));
    }
    if (sort === "source") return [...kept].sort((a, b) => a.source.localeCompare(b.source));
    return kept;
  }, [lists, view, source, aiFilter, search, sort, jobOf]);
  // The panel is open only for a job someone clicked
  const selected = selectedId ? (cards.find((card) => card.id === selectedId) ?? null) : null;
  const position = { index: selected ? Math.max(0, list.indexOf(selected)) : 0, total: list.length };
  const pickable = list.filter((card) => card.state === "check");
  const pickedCards = cards.filter((card) => picked.has(card.id) && card.state === "check");
  const allPicked = pickable.length > 0 && pickable.every((card) => picked.has(card.id));
  const togglePick = (id: string) =>
    setPicked((now) => {
      const next = new Set(now);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pickAll = (on: boolean) =>
    setPicked((now) => {
      const next = new Set(now);
      for (const card of pickable) {
        if (on) next.add(card.id);
        else next.delete(card.id);
      }
      return next;
    });

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
      setDecided((current) => ({ ...current, [card.id]: "approved" }));
      if (!quiet) {
        setNotice({ tone: "ok", text: `Published: ${job.title}. Added to today's channel post.` });
        setSelectedId(nextAfter(card)?.id ?? null);
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nextAfter reads the current list on purpose
    [flagsOf, jobOf, list, logos],
  );

  const discardQuietly = async (card: InboxCard, reason: string) => {
    const job = jobOf(card);
    const result = await discardInboxItemAction(card.id, reason, job ? tidy(job) : null);
    if (result.ok) setDecided((current) => ({ ...current, [card.id]: "discarded" }));
    return result;
  };

  const discard = async (card: InboxCard, reason: string) => {
    setBusy(true);
    const result = await discardQuietly(card, reason);
    setBusy(false);
    setDiscardOpen(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.error });
    setNotice({ tone: "ok", text: `Discarded: ${DISCARD_LABEL[reason] ?? reason}.` });
    setSelectedId(nextAfter(card)?.id ?? null);
    refresh();
  };

  // ---------- ticked rows: publish or discard them all, with a progress bar ----------
  const publishPicked = async () => {
    const chosen = pickedCards;
    if (!chosen.length) return;
    const risky = chosen.filter((card) => flagsOf(card).some((flag) => NEEDS_CONFIRMING.includes(flag.key)));
    const question = risky.length
      ? `${risky.length} of these ${risky.length === 1 ? "has" : "have"} a scam, duplicate or deadline warning (${risky
          .slice(0, 3)
          .map((card) => jobOf(card)?.title ?? "")
          .join(", ")}${risky.length > 3 ? "…" : ""}). Publish all ${chosen.length} anyway?`
      : `Publish these ${chosen.length} job${chosen.length === 1 ? "" : "s"} on the website now?`;
    if (!window.confirm(question)) return;
    setBulk({ done: 0, total: chosen.length, verb: "Publishing" });
    let published = 0;
    const failed: string[] = [];
    for (const [index, card] of chosen.entries()) {
      if (await approve(card, true)) published++;
      else failed.push(jobOf(card)?.title || "A job");
      setBulk({ done: index + 1, total: chosen.length, verb: "Publishing" });
    }
    setBulk(null);
    setPicked(new Set());
    setNotice({
      tone: failed.length && !published ? "error" : "ok",
      text: [
        `Published ${published} job${published === 1 ? "" : "s"}. They're in today's channel post below.`,
        failed.length ? `Not published (open them to see why): ${failed.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
    refresh();
  };

  const discardPicked = async () => {
    const chosen = pickedCards;
    if (!chosen.length) return;
    setBulk({ done: 0, total: chosen.length, verb: "Discarding" });
    let discarded = 0;
    for (const [index, card] of chosen.entries()) {
      if ((await discardQuietly(card, bulkReason)).ok) discarded++;
      setBulk({ done: index + 1, total: chosen.length, verb: "Discarding" });
    }
    setBulk(null);
    setPicked(new Set());
    setNotice({
      tone: "ok",
      text: `Discarded ${discarded} job${discarded === 1 ? "" : "s"} (${DISCARD_LABEL[bulkReason] ?? bulkReason}). Restore any of them from the Discarded tab.`,
    });
    refresh();
  };

  const onApproveSelected = async () => {
    if (selected && (await approve(selected))) refresh();
  };

  // ---------- keyboard: J/K next/previous, A approve, D discard ----------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (!selected) return;
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
      <details className="intake-toggle" open={addOpen} onToggle={(event) => setAddOpen(event.currentTarget.open)}>
        <summary>
          <Icon name="upload" size={18} />
          <span>Add posters</span>
          <small>Drop or paste today&apos;s posters, screenshots, photos or PDFs</small>
        </summary>
        <IntakePanel
          aiPretend={aiPretend}
          sampleFiles={sampleFiles}
          tokens={data.tokens}
          onAdded={(count) => {
            setNotice({ tone: "ok", text: `${count} poster${count > 1 ? "s" : ""} added. Reading now…` });
            setView("reading");
            setAddOpen(false);
            refresh();
          }}
        />
      </details>

      {notice && (
        <p className={notice.tone === "ok" ? "notice" : "notice notice-error"} role="status">
          {notice.text}
        </p>
      )}
      <AskForTokens message={notice?.text} />

      <div className="inbox-bar" ref={barRef}>
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
                setPicked(new Set());
              }}
            >
              {label} <span>{lists[key].length}</span>
            </button>
          ))}
        </nav>
      </div>

      <section className="panel inbox-table-panel">
        <div className="inbox-filters">
          <label className="inbox-search">
            <Icon name="search" size={16} />
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, employer, source…"
            />
          </label>
          <label>
            <span>Source</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">All</option>
              {sources.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>AI check</span>
            <select value={aiFilter} onChange={(event) => setAiFilter(event.target.value as AiFilter)}>
              <option value="">Any</option>
              <option value="job">Real jobs</option>
              <option value="unsure">Not sure</option>
              <option value="none">Not checked</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
              <option value="closing">Closing soonest</option>
              <option value="source">By source</option>
            </select>
          </label>
        </div>

        {pickable.length > 0 && (
          <div className={pickedCards.length ? "inbox-bulk is-active" : "inbox-bulk"}>
            <label className="inbox-check-all">
              <input type="checkbox" checked={allPicked} onChange={(event) => pickAll(event.target.checked)} />
              {pickedCards.length ? `${pickedCards.length} selected` : `Select all ${pickable.length}`}
            </label>
            {pickedCards.length > 0 && (
              <div className="inbox-bulk-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={publishPicked}
                  disabled={Boolean(bulk) || busy}
                >
                  <Icon name="upload" size={16} />
                  Publish {pickedCards.length}
                </button>
                <select
                  aria-label="Why discard"
                  value={bulkReason}
                  onChange={(event) => setBulkReason(event.target.value)}
                >
                  {DISCARD_CHOICES.map((reason) => (
                    <option key={reason} value={reason}>
                      {DISCARD_LABEL[reason] ?? reason}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={discardPicked}
                  disabled={Boolean(bulk) || busy}
                >
                  <Icon name="trash" size={16} />
                  Discard {pickedCards.length}
                </button>
                <button type="button" className="link-btn" onClick={() => setPicked(new Set())}>
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
        {bulk && (
          <ProgressBar
            className="ai-progress inbox-progress"
            percent={Math.round((bulk.done / Math.max(1, bulk.total)) * 100)}
            label={`${bulk.verb} ${bulk.done} of ${bulk.total}…`}
            ariaLabel="Jobs done"
          />
        )}

        {list.length ? (
          <div className="table-wrap-admin">
            <table className="admin-table inbox-table">
              <thead>
                <tr>
                  <th className="inbox-col-pick">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="inbox-col-thumb">
                    <span className="sr-only">Advert</span>
                  </th>
                  <th>Job</th>
                  <th>Location</th>
                  <th>Deadline</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {list.map((card) => (
                  <InboxRow
                    key={card.id}
                    card={card}
                    job={jobOf(card)}
                    flags={flagsOf(card)}
                    picked={picked.has(card.id)}
                    onPick={() => togglePick(card.id)}
                    onOpen={() => {
                      setSelectedId(card.id);
                      setDiscardOpen(false);
                    }}
                    siteUrl={siteUrl}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyTable
            view={view}
            filtered={lists[view].length > 0}
            hasPosters={cards.length > 0}
            waiting={lists.check.length + lists.flagged.length}
          />
        )}
      </section>

      {selected && (
        <JobPanel onClose={() => setSelectedId(null)}>
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
              setDecided(({ [selected.id]: _was, ...rest }) => rest);
              setSelectedId(null);
              setView("check");
              refresh();
            }}
            onReread={async (caption) => {
              const result = await rereadInboxItemAction(selected.id, caption);
              if (!result.ok) return setNotice({ tone: "error", text: result.error });
              // The new reading replaces any corrections made to the old one
              setEdits(({ [selected.id]: _old, ...rest }) => rest);
              setConfirmed(({ [selected.id]: _done, ...rest }) => rest);
              refresh();
            }}
            discardOpen={discardOpen}
            setDiscardOpen={setDiscardOpen}
          />
          <p className="kbd-help">
            Shortcuts: <kbd>J</kbd>/<kbd>K</kbd> next / previous · <kbd>A</kbd> approve &amp; publish · <kbd>D</kbd>{" "}
            discard · <kbd>Esc</kbd> back to the list
          </p>
        </JobPanel>
      )}

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

function InboxRow(props: {
  card: InboxCard;
  job: JobInput | null;
  flags: Flag[];
  picked: boolean;
  onPick: () => void;
  onOpen: () => void;
  siteUrl: string;
}) {
  const { card, job, flags } = props;
  const warnings = flags.filter((flag) => flag.level !== "info");
  const reading = card.state === "reading";
  return (
    <tr className={props.picked ? "is-picked" : undefined}>
      <td className="inbox-col-pick">
        {card.state === "check" && (
          <input
            type="checkbox"
            aria-label={`Select ${job?.title ?? "job"}`}
            checked={props.picked}
            onChange={props.onPick}
          />
        )}
      </td>
      <td className="inbox-col-thumb">
        <button type="button" className="inbox-thumb" onClick={props.onOpen} tabIndex={-1} aria-hidden="true">
          {card.posterUrl ? (
            <img src={card.posterUrl} alt="" loading="lazy" />
          ) : (
            <span className="q-page">{card.pageUrl && /\.pdf(\?|#|$)/i.test(card.pageUrl) ? "PDF" : "Web"}</span>
          )}
        </button>
      </td>
      <td>
        {reading ? (
          <strong className="q-reading">{card.posterUrl ? "Reading poster…" : "Reading job page…"}</strong>
        ) : (
          <button type="button" className="inbox-title" onClick={props.onOpen}>
            {job?.title || "Untitled job"}
          </button>
        )}
        {!reading && <small className="inbox-sub">{job?.company || "Employer not set"}</small>}
        <span className="q-flags">
          {card.state === "check" &&
            (warnings.length ? (
              warnings.map((flag) => (
                <span key={flag.key + flag.text} className={`iflag ${flag.level}`} title={flag.more}>
                  {flag.text}
                </span>
              ))
            ) : (
              <span className="iflag ok">Ready</span>
            ))}
          {card.state === "approved" &&
            (card.jobSlug ? (
              <a
                className="iflag live"
                href={`${props.siteUrl}/jobs/${card.jobSlug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Live ↗
              </a>
            ) : (
              <span className="iflag live">Live</span>
            ))}
          {card.state === "discarded" && (
            <span className="iflag gone">{DISCARD_LABEL[card.discardReason ?? "other"]}</span>
          )}
          {card.aiCheckReason && card.state !== "approved" && (
            <span className={card.aiCheck === "job" ? "inbox-ai ok" : "inbox-ai"} title={card.aiCheckReason}>
              AI: {card.aiCheckReason}
            </span>
          )}
        </span>
      </td>
      <td className="inbox-col-text">{reading ? "" : job?.location || "Not specified"}</td>
      <td className="inbox-col-text">
        {reading ? "" : job?.openEnded || !job?.deadline ? "Open" : formatDay(job.deadline)}
      </td>
      <td className="inbox-col-text">
        {card.source}
        {card.part && (
          <small className="inbox-sub">
            Job {card.part.index} of {card.part.total}
          </small>
        )}
      </td>
    </tr>
  );
}

// One job, opened from the table: the full edit form with the poster or advert beside it
function JobPanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="admin-dialog inbox-panel" onClose={onClose} aria-label="Job">
      <button
        type="button"
        className="icon-btn inbox-panel-close"
        onClick={() => dialog.current?.close()}
        title="Back to the list (Esc)"
      >
        <Icon name="x" />
      </button>
      <div className="inbox-panel-body">{children}</div>
    </dialog>
  );
}

function EmptyTable(props: { view: View; filtered: boolean; hasPosters: boolean; waiting: number }) {
  return (
    <div className="d-empty">
      <Icon name="inbox" />
      <h2>
        {props.filtered
          ? "Nothing matches these filters"
          : !props.hasPosters
            ? "No jobs yet"
            : props.waiting
              ? EMPTY[props.view]
              : "All caught up"}
      </h2>
      <p>
        {props.filtered
          ? "Clear the search or pick another source."
          : !props.hasPosters
            ? "Add posters above, or let your job sources find some."
            : props.waiting
              ? `${props.waiting} job${props.waiting > 1 ? "s are" : " is"} waiting in the other tabs.`
              : "Every job has been published or discarded. Copy today's channel post below."}
      </p>
    </div>
  );
}
