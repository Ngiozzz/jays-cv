"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import {
  addJobSourceAction,
  addStarterSourcesAction,
  addSuggestedSourcesAction,
  checkJobSourceAction,
  hideSuggestionAction,
  markJobSourcesAction,
  openJobSourceAction,
  removeJobSourcesAction,
  saveBannedSitesAction,
  setJobSourcesEnabledAction,
  setMorningRunAction,
} from "@/app/(admin)/admin/(signed-in)/job-sources/actions";
import { AiProgress, ProgressBar } from "@/components/ai/AiProgress";
import { AskForTokens } from "@/components/admin/AskForTokens";
import { Fold } from "@/components/admin/Fold";
import { Icon } from "@/components/icons/Icon";
import type { JobSourceRow, JobSourcesView, QuickAddResult, SourceFind } from "@/modules/job-sources/job-sources.admin";
import { checkedLabel, checkSummary } from "@/modules/job-sources/labels";
import { groupOf, matchesSearch, SOURCE_GROUPS, type SourceGroupKey } from "@/modules/job-sources/source-inbox";
import { STARTER_GROUPS } from "@/modules/job-sources/starter-sources";

type Props = { data: JobSourcesView; dailyLimit: number; maxFailures: number };
type Message = { tone: "ok" | "error"; text: string } | null;

// What a check does, in order (spread over the usual time by the progress bar)
const CHECK_STEPS = [
  "Opening the page",
  "Finding the links",
  "Picking out the job adverts",
  "Adding new jobs to Bulk post",
];
// Quick jobs (switching on/off, saving) still show a short bar, so a slow connection never looks stuck
const SAVE_STEPS = ["Saving"];
// Rows shown per group before "Show more"
const PAGE = 50;

// Owner screen: the websites read every morning for new jobs, kept like an email inbox so hundreds
// of employers stay manageable; every other section folds away
export function JobSourcesBoard({ data, dailyLimit, maxFailures }: Props) {
  const openStarters = data.starters.filter((starter) => !starter.added);
  return (
    <>
      <MorningSwitch on={data.morning} dailyLimit={dailyLimit} />
      <div className="board-actions">
        <Link className="btn btn-primary" href="/admin/job-sources/found">
          <Icon name="list" size={18} />
          See the jobs found
        </Link>
      </div>
      <SourceInbox sources={data.sources} maxFailures={maxFailures} />
      {openStarters.length > 0 && (
        <Fold
          id="src-starters"
          title="Ready-made list"
          icon="list"
          count={openStarters.length}
          defaultOpen={data.sources.length === 0}
          className="panel"
        >
          <StarterList starters={openStarters} />
        </Fold>
      )}
      {data.suggestions.length > 0 && (
        <Fold
          id="src-suggest"
          title="From the jobs you post"
          icon="sparkle"
          count={data.suggestions.length}
          defaultOpen={false}
          className="panel"
        >
          <Suggestions suggestions={data.suggestions} />
        </Fold>
      )}
      <Fold id="src-add" title="Add one yourself" icon="plus" defaultOpen={data.sources.length === 0} className="panel">
        <AddSource />
      </Fold>
      <Fold
        id="src-banned"
        title="Banned sites"
        icon="lock"
        count={data.builtInBanned.length + data.extraBanned.length}
        defaultOpen={false}
        className="panel"
      >
        <BannedSites builtIn={data.builtInBanned} extra={data.extraBanned} />
      </Fold>
    </>
  );
}

// ---------- Your sources, as an inbox ----------

type View = "all" | "unread" | "attention" | "off";
type CheckRun = { done: number; total: number; current: string; added: number; problems: string[] };

function SourceInbox({ sources, maxFailures }: { sources: JobSourceRow[]; maxFailures: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // The open source, and the group it was in: it stays there while open, like an opened email
  const [opened, setOpened] = useState<{ id: string; group: SourceGroupKey } | null>(null);
  const openId = opened?.id ?? null;
  // Read or unread as just changed here, until the page catches up
  const [readNow, setReadNow] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState<Record<string, number>>({});
  const [run, setRun] = useState<CheckRun | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const rows = useMemo(
    () => sources.map((source) => (source.id in readNow ? { ...source, unread: !readNow[source.id] } : source)),
    [sources, readNow],
  );
  const counts = {
    all: rows.length,
    unread: rows.filter((row) => row.unread).length,
    attention: rows.filter((row) => row.enabled && row.lastError).length,
    off: rows.filter((row) => !row.enabled).length,
  };
  const visible = rows.filter(
    (row) =>
      matchesSearch(row, search) &&
      (view === "all" ||
        (view === "unread" && row.unread) ||
        (view === "attention" && row.enabled && row.lastError) ||
        (view === "off" && !row.enabled)),
  );
  const pickedRows = rows.filter((row) => picked.has(row.id));
  const allPicked = visible.length > 0 && visible.every((row) => picked.has(row.id));
  const somePicked = visible.some((row) => picked.has(row.id));
  const locked = Boolean(run) || pending;

  const pick = (id: string, on: boolean) =>
    setPicked((now) => {
      const next = new Set(now);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const pickAll = (on: boolean) => setPicked(on ? new Set(visible.map((row) => row.id)) : new Set());

  // Checks sources one at a time (each check is its own short request, so a long list never times out)
  const checkMany = async (list: JobSourceRow[]) => {
    setMessage(null);
    const state: CheckRun = { done: 0, total: list.length, current: "", added: 0, problems: [] };
    for (const source of list) {
      setRun({ ...state, current: source.name });
      try {
        const result = await checkJobSourceAction(source.id);
        if (result.ok) state.added += result.added;
        else state.problems.push(`${source.name}: ${result.error}`);
      } catch {
        state.problems.push(`${source.name}: the check didn't finish`);
      }
      state.done += 1;
    }
    setRun(null);
    const jobs = state.added === 1 ? "1 new job" : `${state.added} new jobs`;
    setMessage({
      tone: state.problems.length === state.total ? "error" : "ok",
      text: [
        `Checked ${state.total} source${state.total === 1 ? "" : "s"}: ${jobs} added to Bulk post.`,
        state.problems.length ? `Problems: ${state.problems.join("; ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
    router.refresh();
  };

  const bulk = (action: () => Promise<unknown>, after?: () => void) =>
    start(async () => {
      await action();
      after?.();
      setPicked(new Set());
      router.refresh();
    });
  const markRead = (ids: string[], read: boolean) => {
    setReadNow((now) => ({ ...now, ...Object.fromEntries(ids.map((id) => [id, read])) }));
    bulk(() => markJobSourcesAction(ids, read));
  };
  const remove = (list: JobSourceRow[]) => {
    const what = list.length === 1 ? `"${list[0].name}"` : `these ${list.length} sources`;
    if (!window.confirm(`Remove ${what}? Jobs already found stay where they are.`)) return;
    bulk(() => removeJobSourcesAction(list.map((row) => row.id)));
  };

  return (
    <section className="panel src-inbox">
      <div className="src-top">
        <h2 className="editor-title">
          <Icon name="globe" />
          Your sources
        </h2>
        <label className="src-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search sources</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${rows.length} sources by name or website`}
          />
        </label>
      </div>

      <nav className="src-views" aria-label="Show">
        {(
          [
            ["all", "All"],
            ["unread", "Unread"],
            ["attention", "Problems"],
            ["off", "Switched off"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => {
              setView(key);
              setPicked(new Set());
            }}
          >
            {label}
            <span className={key === "unread" && counts.unread ? "is-new" : undefined}>{counts[key]}</span>
          </button>
        ))}
      </nav>

      <div className="src-toolbar" role="toolbar" aria-label="Sources">
        <input
          type="checkbox"
          aria-label={allPicked ? "Select none" : "Select all shown"}
          checked={allPicked}
          ref={(el) => {
            if (el) el.indeterminate = somePicked && !allPicked;
          }}
          onChange={(event) => pickAll(event.target.checked)}
          disabled={!visible.length || locked}
        />
        {pickedRows.length ? (
          <>
            <span className="src-picked">{pickedRows.length} selected</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void checkMany(pickedRows.filter((row) => row.enabled))}
              disabled={locked || !pickedRows.some((row) => row.enabled)}
            >
              <Icon name="refresh" size={16} />
              Check
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                markRead(
                  pickedRows.map((row) => row.id),
                  true,
                )
              }
              disabled={locked}
            >
              <Icon name="eye" size={16} />
              Mark as read
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                markRead(
                  pickedRows.map((row) => row.id),
                  false,
                )
              }
              disabled={locked}
            >
              <Icon name="mail" size={16} />
              Mark as unread
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                bulk(() =>
                  setJobSourcesEnabledAction(
                    pickedRows.map((row) => row.id),
                    true,
                  ),
                )
              }
              disabled={locked}
            >
              Switch on
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                bulk(() =>
                  setJobSourcesEnabledAction(
                    pickedRows.map((row) => row.id),
                    false,
                  ),
                )
              }
              disabled={locked}
            >
              Switch off
            </button>
            <button
              type="button"
              className="icon-btn danger"
              title="Remove"
              aria-label="Remove the selected sources"
              onClick={() => remove(pickedRows)}
              disabled={locked}
            >
              <Icon name="trash" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void checkMany(rows.filter((row) => row.enabled))}
              disabled={locked || !rows.some((row) => row.enabled)}
            >
              <Icon name="refresh" size={16} />
              {run ? "Checking…" : `Check all (${rows.filter((row) => row.enabled).length})`}
            </button>
            {counts.unread > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  markRead(
                    rows.filter((row) => row.unread).map((row) => row.id),
                    true,
                  )
                }
                disabled={locked}
              >
                <Icon name="eye" size={16} />
                Mark all as read
              </button>
            )}
          </>
        )}
      </div>

      {run && (
        <ProgressBar
          percent={Math.round((run.done / run.total) * 100)}
          label={run.done < run.total ? `Checking ${run.done + 1} of ${run.total}: ${run.current}…` : "Finishing…"}
          ariaLabel="Sources checked"
        />
      )}
      <AiProgress active={pending} seconds={2} steps={SAVE_STEPS} />
      {message && <p className={message.tone === "ok" ? "notice" : "field-error"}>{message.text}</p>}
      <AskForTokens message={message?.text} />

      {!rows.length ? (
        <p className="src-empty">No sources yet. Tick some from the ready-made list below, or add your own.</p>
      ) : !visible.length ? (
        <p className="src-empty">No sources match{search ? ` "${search}"` : " this view"}.</p>
      ) : (
        SOURCE_GROUPS.map((group) => {
          const inGroup = visible.filter((row) => (row.id === opened?.id ? opened.group : groupOf(row)) === group.key);
          if (!inGroup.length) return null;
          const limit = shown[group.key] ?? PAGE;
          const newJobs = inGroup.reduce((sum, row) => sum + row.newCount, 0);
          return (
            <Fold
              key={group.key}
              id={`src-group-${group.key}`}
              variant="group"
              title={group.title}
              count={inGroup.length}
              note={group.key === "unread" && newJobs ? `${newJobs} new job${newJobs === 1 ? "" : "s"}` : undefined}
              defaultOpen={group.key !== "rest" || inGroup.length <= 20}
            >
              <ul className="src-list">
                {inGroup.slice(0, limit).map((row) => (
                  <SourceLine
                    key={row.id}
                    source={row}
                    maxFailures={maxFailures}
                    picked={picked.has(row.id)}
                    onPick={(on) => pick(row.id, on)}
                    open={openId === row.id}
                    onOpen={() => {
                      const opening = openId !== row.id;
                      setOpened(opening ? { id: row.id, group: groupOf(row) } : null);
                      if (opening && row.unread) setReadNow((now) => ({ ...now, [row.id]: true }));
                    }}
                    onMarkUnread={() => {
                      setOpened(null);
                      markRead([row.id], false);
                    }}
                    onRemove={() => remove([row])}
                    locked={locked}
                  />
                ))}
              </ul>
              {inGroup.length > limit && (
                <button
                  type="button"
                  className="src-more"
                  onClick={() => setShown((now) => ({ ...now, [group.key]: limit + PAGE }))}
                >
                  Show {Math.min(PAGE, inGroup.length - limit)} more of {inGroup.length - limit}
                </button>
              )}
            </Fold>
          );
        })
      )}
    </section>
  );
}

type LineProps = {
  source: JobSourceRow;
  maxFailures: number;
  picked: boolean;
  onPick: (on: boolean) => void;
  open: boolean;
  onOpen: () => void;
  onMarkUnread: () => void;
  onRemove: () => void;
  locked: boolean;
};

// One source as one line, like an email in a list: bold while it has new finds; open it to see them
function SourceLine({ source, maxFailures, picked, onPick, open, onOpen, onMarkUnread, onRemove, locked }: LineProps) {
  const status = source.enabled
    ? source.lastError
      ? { cls: "warn", text: `Problem ${source.failures}/${maxFailures}` }
      : null
    : source.stoppedByFailures
      ? { cls: "bad", text: "Stopped" }
      : { cls: "off", text: "Off" };
  const snippet = source.lastError
    ? `Last check failed: ${source.lastError}`
    : source.newCount
      ? `${source.newCount} new job${source.newCount === 1 ? "" : "s"} found`
      : source.lastFoundAt
        ? `Last found jobs ${checkedLabel(source.lastFoundAt).toLowerCase()}`
        : "No jobs found yet";

  return (
    <li
      className={["src-line", source.unread ? "is-unread" : "", open ? "is-open" : "", picked ? "is-picked" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="src-row">
        <input
          type="checkbox"
          checked={picked}
          onChange={(event) => onPick(event.target.checked)}
          aria-label={`Select ${source.name}`}
        />
        <span className="src-dot" aria-hidden="true" />
        <button type="button" className="src-open" onClick={onOpen} aria-expanded={open}>
          <span className="src-name">
            {source.name}
            {source.unread && <span className="sr-only"> (unread)</span>}
          </span>
          <span className="src-snippet">
            <span className="src-site">{source.site}</span>
            <span className={source.lastError ? "src-text is-error" : "src-text"}> — {snippet}</span>
          </span>
          {/* Every row keeps the same columns, so the counts and dates line up down the list */}
          <span className="src-flag">
            {status && <span className={`source-status ${status.cls}`}>{status.text}</span>}
          </span>
          <span className="src-count">{source.newCount > 0 && <span className="src-new">{source.newCount}</span>}</span>
          <span className="src-when">{checkedLabel(source.lastCheckedAt)}</span>
        </button>
      </div>
      {open && (
        <SourceDetail
          source={source}
          maxFailures={maxFailures}
          onMarkUnread={onMarkUnread}
          onRemove={onRemove}
          locked={locked}
        />
      )}
    </li>
  );
}

// An opened source: its latest finds (opening it counts as reading them) and what can be done with it
function SourceDetail({
  source,
  maxFailures,
  onMarkUnread,
  onRemove,
  locked,
}: {
  source: JobSourceRow;
  maxFailures: number;
  onMarkUnread: () => void;
  onRemove: () => void;
  locked: boolean;
}) {
  const router = useRouter();
  const [finds, setFinds] = useState<SourceFind[] | null>(null);
  const [loading, startLoading] = useTransition();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"check" | "toggle" | null>(null);
  const [message, setMessage] = useState<Message>(null);
  // Opening the row loads its finds, and the server counts it as read from now
  useEffect(() => {
    startLoading(async () => setFinds(await openJobSourceAction(source.id)));
  }, [source.id]);

  const check = () => {
    setBusy("check");
    setMessage(null);
    start(async () => {
      const result = await checkJobSourceAction(source.id);
      setMessage(result.ok ? { tone: "ok", text: checkSummary(result) } : { tone: "error", text: result.error });
      setFinds(await openJobSourceAction(source.id));
      setBusy(null);
      router.refresh();
    });
  };
  const toggle = () => {
    setBusy("toggle");
    start(async () => {
      await setJobSourcesEnabledAction([source.id], !source.enabled);
      setBusy(null);
      router.refresh();
    });
  };

  return (
    <div className="src-detail">
      <div className="src-detail-head">
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          {source.url} <Icon name="link" size={14} />
        </a>
        <span>
          Last checked {checkedLabel(source.lastCheckedAt).toLowerCase()}
          {source.lastCheckedAt && !source.lastError ? ` · ${source.lastAdded} added that time` : ""}
        </span>
      </div>
      {source.lastError && (
        <p className="source-error">
          <Icon name="alert" size={16} />
          {source.stoppedByFailures
            ? `Stopped after ${maxFailures} failed mornings: ${source.lastError}. Check the address still works, then switch it back on.`
            : `Last check failed: ${source.lastError}.`}
        </p>
      )}

      <div className="src-finds">
        <p className="src-finds-label">Latest jobs found</p>
        {loading && !finds ? (
          <p className="hint-sm">Loading…</p>
        ) : finds?.length ? (
          <ul>
            {finds.map((find) => (
              <li key={find.id}>
                <span className={`find-state ${find.status}`}>{FIND_LABEL[find.status]}</span>
                {find.jobSlug ? (
                  <a href={`/jobs/${find.jobSlug}`} target="_blank" rel="noopener">
                    {find.title}
                  </a>
                ) : (
                  <Link href={`/admin/inbox?item=${find.id}`}>{find.title}</Link>
                )}
                <small>{checkedLabel(find.foundAt)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint-sm">Nothing found yet. New jobs on its page are added each time it&apos;s checked.</p>
        )}
        {Boolean(finds?.length) && (
          <Link className="text-link" href={`/admin/job-sources/found?source=${encodeURIComponent(source.name)}`}>
            See all its jobs in Jobs found →
          </Link>
        )}
      </div>

      <div className="src-detail-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={check} disabled={pending || locked}>
          <Icon name="refresh" size={16} />
          {busy === "check" ? "Checking…" : "Check now"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={toggle} disabled={pending || locked}>
          {busy === "toggle" ? "Saving…" : source.enabled ? "Switch off" : "Switch on"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onMarkUnread} disabled={pending || locked}>
          <Icon name="mail" size={16} />
          Mark as unread
        </button>
        <button
          type="button"
          className="icon-btn danger"
          title="Remove"
          onClick={onRemove}
          disabled={pending || locked}
        >
          <Icon name="trash" />
        </button>
      </div>
      <AiProgress
        active={busy !== null}
        seconds={busy === "check" ? 20 : 2}
        steps={busy === "check" ? CHECK_STEPS : SAVE_STEPS}
        className="source-progress"
      />
      {message && <p className={message.tone === "ok" ? "notice" : "field-error"}>{message.text}</p>}
      <AskForTokens message={message?.text} />
    </div>
  );
}

const FIND_LABEL: Record<SourceFind["status"], string> = {
  reading: "Reading",
  waiting: "To check",
  published: "Published",
  discarded: "Discarded",
};

// ---------- The morning run ----------

// Every source checked and its new jobs read before the working day starts
function MorningSwitch({ on, dailyLimit }: { on: boolean; dailyLimit: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      await setMorningRunAction(!on);
      router.refresh();
    });
  return (
    <section className={on ? "morning-switch is-on" : "morning-switch"}>
      <div>
        <strong>Morning check: {on ? "On" : "Off"}</strong>
        <p className="hint-sm">
          {on ? (
            <>
              Every morning from 5:00 the website checks your sources, puts up to {dailyLimit} new jobs from each into{" "}
              <Link href="/admin/inbox">Bulk post</Link> and reads them with the AI, so they are ready to check by 8:00.
              Nothing is published until someone checks it.
            </>
          ) : (
            <>
              Switch it on to check your sources every morning and have the new jobs read and waiting in Bulk post.
              Until then, use Check all and Read all yourself. Uses AI tokens each morning.
            </>
          )}
        </p>
      </div>
      <button type="button" className={on ? "btn btn-ghost" : "btn btn-primary"} onClick={toggle} disabled={pending}>
        {pending ? "Saving…" : on ? "Switch off" : "Switch on"}
      </button>
    </section>
  );
}

// ---------- Adding sources ----------

function AddSource() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Partial<Record<"name" | "url" | "form", string>>>({});
  const [message, setMessage] = useState<Message>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setErrors({});
    setMessage(null);
    start(async () => {
      const result = await addJobSourceAction(form);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      formElement.reset();
      setMessage({ tone: "ok", text: `Source added and checked. ${checkSummary(result.outcome)}` });
      router.refresh();
    });
  };

  return (
    <>
      <form className="source-add" noValidate onSubmit={submit}>
        <div className={errors.name ? "f invalid" : "f"}>
          <label htmlFor="src-name">Name</label>
          <input id="src-name" name="name" type="text" placeholder="KRA careers" maxLength={80} />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>
        <div className={errors.url ? "f invalid" : "f"}>
          <label htmlFor="src-url">Address of the vacancies page (or job feed)</label>
          <input id="src-url" name="url" type="url" inputMode="url" placeholder="https://www.kra.go.ke/careers" />
          {errors.url && <p className="field-error">{errors.url}</p>}
          <AskForTokens message={errors.url} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Icon name="plus" size={18} />
          {pending ? "Checking the page…" : "Add and test"}
        </button>
      </form>
      <AiProgress active={pending} seconds={20} steps={CHECK_STEPS} />
      {errors.form && <p className="field-error">{errors.form}</p>}
      {message && <p className={message.tone === "ok" ? "notice" : "field-error"}>{message.text}</p>}
      <AskForTokens message={message?.text} />
    </>
  );
}

function BannedSites({ builtIn, extra }: { builtIn: readonly string[]; extra: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(extra.join("\n"));
  const [message, setMessage] = useState<string | null>(null);

  const save = () =>
    start(async () => {
      const result = await saveBannedSitesAction(text);
      setText(result.sites.join("\n"));
      setEditing(false);
      setMessage(
        result.stopped.length ? `Switched off because their site is now banned: ${result.stopped.join(", ")}.` : null,
      );
      router.refresh();
    });

  return (
    <>
      <p className="hint-sm">
        Job boards don&apos;t allow their jobs to be copied, so these are never read, even through a link.
      </p>
      <ul className="banned-list">
        {builtIn.map((site) => (
          <li key={site}>
            <Icon name="lock" size={14} />
            {site}
          </li>
        ))}
        {extra.map((site) => (
          <li key={site} className="is-extra">
            {site}
          </li>
        ))}
      </ul>
      {editing ? (
        <div className="f">
          <label htmlFor="banned-extra">Your extra banned sites, one per line</label>
          <textarea id="banned-extra" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="source-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          <Icon name="edit" size={16} />
          Edit your extra sites
        </button>
      )}
      <AiProgress active={pending} seconds={2} steps={SAVE_STEPS} />
      {message && <p className="notice">{message}</p>}
    </>
  );
}

function quickAddMessage(result: QuickAddResult): Message {
  const parts = [
    result.added.length
      ? `Added ${result.added.length} source${result.added.length === 1 ? "" : "s"}. They are checked every morning at 5:00, or click Check now.`
      : "",
    ...result.failed.map((fail) => `${fail.name}: ${fail.error}.`),
  ].filter(Boolean);
  if (!parts.length) return null;
  return { tone: result.failed.length && !result.added.length ? "error" : "ok", text: parts.join(" ") };
}

// The ready-made list: tick the ones wanted, add them in one go. Each group folds on its own.
function StarterList({ starters }: { starters: JobSourcesView["starters"] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<Message>(null);

  const toggle = (id: string) =>
    setPicked((now) => {
      const next = new Set(now);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleGroup = (ids: string[], on: boolean) =>
    setPicked((now) => {
      const next = new Set(now);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  const add = () =>
    start(async () => {
      const result = await addStarterSourcesAction([...picked]);
      setPicked(new Set());
      setMessage(quickAddMessage(result));
      router.refresh();
    });

  return (
    <>
      <div className="starter-bar">
        <p className="hint-sm">Kenyan vacancies pages already checked to work. Tick the ones you want.</p>
        {starters.length > 1 && (
          <label className="starter-item starter-all">
            <input
              type="checkbox"
              checked={starters.every((starter) => picked.has(starter.id))}
              onChange={(event) =>
                toggleGroup(
                  starters.map((starter) => starter.id),
                  event.target.checked,
                )
              }
            />
            Select all ({starters.length})
          </label>
        )}
      </div>
      {STARTER_GROUPS.map((group) => {
        const items = starters.filter((starter) => starter.group === group);
        if (!items.length) return null;
        const ids = items.map((item) => item.id);
        const ticked = ids.filter((id) => picked.has(id)).length;
        return (
          <Fold
            key={group}
            id={`starter-${group}`}
            variant="group"
            title={group}
            count={items.length}
            note={ticked ? `${ticked} ticked` : undefined}
            defaultOpen={false}
            actions={
              <button type="button" className="link-btn" onClick={() => toggleGroup(ids, ticked !== ids.length)}>
                {ticked === ids.length ? "Untick all" : "Tick all"}
              </button>
            }
          >
            <div className="starter-grid">
              {items.map((item) => (
                <label key={item.id} className="starter-item">
                  <input type="checkbox" checked={picked.has(item.id)} onChange={() => toggle(item.id)} />
                  {item.name}
                </label>
              ))}
            </div>
          </Fold>
        );
      })}
      <button type="button" className="btn btn-primary" onClick={add} disabled={pending || !picked.size}>
        <Icon name="plus" size={18} />
        {pending ? "Adding…" : picked.size ? `Add ${picked.size} selected` : "Tick some to add"}
      </button>
      <AiProgress active={pending} seconds={Math.max(2, picked.size * 0.4)} steps={["Saving the sources"]} />
      {message && <p className={message.tone === "ok" ? "notice" : "field-error"}>{message.text}</p>}
      <AskForTokens message={message?.text} />
    </>
  );
}

// Employers from the jobs already posted: their careers page is found on their website
function Suggestions({ suggestions }: { suggestions: JobSourcesView["suggestions"] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState<string[]>([]);
  const [hiding, setHiding] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? suggestions : suggestions.slice(0, 10);

  const add = (sites: string[]) => {
    setAdding(sites);
    setMessage(null);
    start(async () => {
      const result = await addSuggestedSourcesAction(sites);
      setMessage(quickAddMessage(result));
      setAdding([]);
      router.refresh();
    });
  };
  const hide = (site: string) =>
    start(async () => {
      setHiding(site);
      await hideSuggestionAction(site);
      setHiding(null);
      router.refresh();
    });

  return (
    <>
      <p className="hint-sm">
        Employers whose jobs are on your board. Click Add and their careers page is found on their website for you.
      </p>
      <ul className="suggest-list">
        {list.map((suggestion) => (
          <li key={suggestion.site}>
            <span className="suggest-main">
              <strong>{suggestion.company}</strong>
              <small>
                {suggestion.site} · {suggestion.jobs} job{suggestion.jobs === 1 ? "" : "s"} posted
              </small>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => add([suggestion.site])}
              disabled={pending}
            >
              {adding.length === 1 && adding[0] === suggestion.site ? "Looking…" : "Add"}
            </button>
            <button type="button" className="link-btn" onClick={() => hide(suggestion.site)} disabled={pending}>
              Hide
            </button>
          </li>
        ))}
      </ul>
      {suggestions.length > list.length && (
        <button type="button" className="src-more" onClick={() => setShowAll(true)}>
          Show all {suggestions.length}
        </button>
      )}
      <AiProgress active={hiding !== null} seconds={2} steps={["Hiding"]} />
      <AiProgress
        active={adding.length > 0}
        seconds={Math.min(120, 6 * adding.length)}
        steps={["Opening their websites", "Looking for the careers pages", "Saving the sources"]}
      />
      {suggestions.length > 1 && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => add(suggestions.map((s) => s.site))}
          disabled={pending}
        >
          <Icon name="plus" size={18} />
          {adding.length > 1 ? `Looking at ${adding.length} websites…` : `Add all ${suggestions.length}`}
        </button>
      )}
      {message && <p className={message.tone === "ok" ? "notice" : "field-error"}>{message.text}</p>}
      <AskForTokens message={message?.text} />
    </>
  );
}
