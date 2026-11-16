"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  addJobSourceAction,
  addStarterSourcesAction,
  addSuggestedSourcesAction,
  hideSuggestionAction,
  checkJobSourceAction,
  removeJobSourceAction,
  setMorningRunAction,
  saveBannedSitesAction,
  setJobSourceEnabledAction,
} from "@/app/(admin)/admin/(signed-in)/job-sources/actions";
import { AiProgress, ProgressBar } from "@/components/ai/AiProgress";
import { AskForTokens } from "@/components/admin/AskForTokens";
import { Icon } from "@/components/icons/Icon";
import type { JobSourceRow, JobSourcesView, QuickAddResult } from "@/modules/job-sources/job-sources.admin";
import { checkedLabel, checkSummary } from "@/modules/job-sources/labels";
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

// Owner screen: the websites read every morning for new jobs, and the sites that may never be read
export function JobSourcesBoard({ data, dailyLimit, maxFailures }: Props) {
  return (
    <>
      <MorningSwitch on={data.morning} dailyLimit={dailyLimit} />
      <div className="board-actions">
        <Link className="btn btn-primary" href="/admin/job-sources/found">
          <Icon name="list" size={18} />
          See the jobs found
        </Link>
      </div>
      <YourSources sources={data.sources} maxFailures={maxFailures} />
      <StarterList starters={data.starters} />
      <Suggestions suggestions={data.suggestions} />
      <AddSource />
      <BannedSites builtIn={data.builtInBanned} extra={data.extraBanned} />
    </>
  );
}

type CheckAllRun = { done: number; total: number; current: string; added: number; problems: string[] };

// The business's sources, with "Check all": each switched-on source is checked in turn (one site at
// a time, and each check is its own short request, so a long list never runs into a time limit)
function YourSources({ sources, maxFailures }: { sources: JobSourceRow[]; maxFailures: number }) {
  const router = useRouter();
  const [run, setRun] = useState<CheckAllRun | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const enabled = sources.filter((source) => source.enabled);

  const checkAll = async () => {
    setMessage(null);
    const state: CheckAllRun = { done: 0, total: enabled.length, current: "", added: 0, problems: [] };
    for (const source of enabled) {
      setRun({ ...state, current: source.name });
      try {
        const result = await checkJobSourceAction(source.id);
        if (result.ok) state.added += result.added;
        else state.problems.push(`${source.name}: ${result.error}`);
      } catch {
        state.problems.push(`${source.name}: the check didn't finish`);
      }
      state.done += 1;
      setRun({ ...state, current: source.name });
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

  return (
    <section className="panel panel-body sources-panel">
      <div className="sources-head">
        <h2 className="editor-title">
          <Icon name="globe" />
          Your sources
        </h2>
        {enabled.length > 1 && (
          <button type="button" className="btn btn-primary btn-sm" onClick={checkAll} disabled={Boolean(run)}>
            <Icon name="refresh" size={16} />
            {run ? "Checking…" : `Check all (${enabled.length})`}
          </button>
        )}
      </div>
      {run && (
        <ProgressBar
          percent={Math.round((run.done / run.total) * 100)}
          label={run.done < run.total ? `Checking ${run.done + 1} of ${run.total}: ${run.current}…` : "Finishing…"}
          ariaLabel="Sources checked"
        />
      )}
      {message && <p className={message.tone === "ok" ? "notice" : "field-error"}>{message.text}</p>}
      <AskForTokens message={message?.text} />
      {sources.length ? (
        <ul className="source-list">
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} maxFailures={maxFailures} locked={Boolean(run)} />
          ))}
        </ul>
      ) : (
        <p className="hint-sm">No sources yet. Tick some from the ready-made list below, or add your own.</p>
      )}
    </section>
  );
}

// Quick jobs (switching on/off, saving) still show a short bar, so a slow connection never looks stuck
const SAVE_STEPS = ["Saving"];

// The morning run: every source checked and its new jobs read before the working day starts
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
    <section className="panel panel-body sources-panel">
      <h2 className="editor-title">
        <Icon name="plus" />
        Add one yourself
      </h2>
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
    </section>
  );
}

function SourceRow({ source, maxFailures, locked }: { source: JobSourceRow; maxFailures: number; locked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"check" | "toggle" | "remove" | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const run = (what: "check" | "toggle" | "remove", action: () => Promise<Message>) => {
    setBusy(what);
    setMessage(null);
    start(async () => {
      setMessage(await action());
      setBusy(null);
      router.refresh();
    });
  };

  const check = () =>
    run("check", async () => {
      const result = await checkJobSourceAction(source.id);
      return result.ok ? { tone: "ok", text: checkSummary(result) } : { tone: "error", text: result.error };
    });
  const toggle = () =>
    run("toggle", async () => {
      const result = await setJobSourceEnabledAction(source.id, !source.enabled);
      return result.ok ? null : { tone: "error", text: result.error };
    });
  const remove = () => {
    if (!window.confirm(`Remove "${source.name}"? Jobs it already found stay where they are.`)) return;
    run("remove", async () => {
      const result = await removeJobSourceAction(source.id);
      return result.ok ? null : { tone: "error", text: result.error };
    });
  };

  const status = source.enabled
    ? source.lastError
      ? { cls: "warn", text: `Problem (${source.failures} of ${maxFailures})` }
      : { cls: "ok", text: "Working" }
    : source.stoppedByFailures
      ? { cls: "bad", text: "Stopped" }
      : { cls: "off", text: "Off" };

  return (
    <li className={source.enabled ? "source-row" : "source-row is-off"}>
      <div className="source-main">
        <strong>{source.name}</strong>
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          {source.site} <Icon name="link" size={14} />
        </a>
      </div>
      <div className="source-stats">
        <span>
          <small>Last checked</small>
          {checkedLabel(source.lastCheckedAt)}
        </span>
        <span>
          <small>New jobs</small>
          {source.lastCheckedAt && !source.lastError ? source.lastAdded : "–"}
        </span>
        <span className={`source-status ${status.cls}`}>{status.text}</span>
      </div>
      <div className="source-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={check} disabled={pending || locked}>
          <Icon name="refresh" size={16} />
          {busy === "check" ? "Checking…" : "Check now"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={toggle} disabled={pending || locked}>
          {source.enabled ? "Switch off" : "Switch on"}
        </button>
        <button type="button" className="icon-btn danger" title="Remove" onClick={remove} disabled={pending || locked}>
          <Icon name="trash" />
        </button>
      </div>
      <AiProgress
        active={busy !== null}
        seconds={busy === "check" ? 20 : 2}
        steps={busy === "check" ? CHECK_STEPS : busy === "remove" ? ["Removing"] : SAVE_STEPS}
        className="source-progress"
      />
      {source.lastError && (
        <p className="source-error">
          <Icon name="alert" size={16} />
          {source.stoppedByFailures
            ? `Stopped after ${maxFailures} failed mornings: ${source.lastError}. Check the address still works, then switch it back on.`
            : `Last check failed: ${source.lastError}.`}
        </p>
      )}
      {message && <p className={message.tone === "ok" ? "notice" : "field-error"}>{message.text}</p>}
      <AskForTokens message={message?.text} />
    </li>
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
    <section className="panel panel-body sources-panel">
      <h2 className="editor-title">
        <Icon name="lock" />
        Banned sites
      </h2>
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
    </section>
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

// The ready-made list: tick the ones wanted, add them in one go
function StarterList({ starters }: { starters: JobSourcesView["starters"] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<Message>(null);
  const open = starters.filter((starter) => !starter.added);
  if (!open.length && !message) return null;

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
    <section className="panel panel-body sources-panel">
      <h2 className="editor-title">
        <Icon name="list" />
        Ready-made list
      </h2>
      <p className="hint-sm">Kenyan vacancies pages already checked to work. Tick the ones you want.</p>
      {open.length > 1 && (
        <label className="starter-item starter-all">
          <input
            type="checkbox"
            checked={open.every((starter) => picked.has(starter.id))}
            onChange={(event) =>
              toggleGroup(
                open.map((starter) => starter.id),
                event.target.checked,
              )
            }
          />
          Select all ({open.length})
        </label>
      )}
      {STARTER_GROUPS.map((group) => {
        const items = open.filter((starter) => starter.group === group);
        if (!items.length) return null;
        const ids = items.map((item) => item.id);
        const all = ids.every((id) => picked.has(id));
        return (
          <fieldset key={group} className="starter-group">
            <legend>
              {group}
              <button type="button" className="link-btn" onClick={() => toggleGroup(ids, !all)}>
                {all ? "Untick all" : "Tick all"}
              </button>
            </legend>
            <div className="starter-grid">
              {items.map((item) => (
                <label key={item.id} className="starter-item">
                  <input type="checkbox" checked={picked.has(item.id)} onChange={() => toggle(item.id)} />
                  {item.name}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      {open.length > 0 && (
        <button type="button" className="btn btn-primary" onClick={add} disabled={pending || !picked.size}>
          <Icon name="plus" size={18} />
          {pending ? "Adding…" : picked.size ? `Add ${picked.size} selected` : "Tick some to add"}
        </button>
      )}
      <AiProgress active={pending} seconds={Math.max(2, picked.size * 0.4)} steps={["Saving the sources"]} />
      {message && <p className={message.tone === "ok" ? "notice" : "field-error"}>{message.text}</p>}
      <AskForTokens message={message?.text} />
    </section>
  );
}

// Employers from the jobs already posted: their careers page is found on their website
function Suggestions({ suggestions }: { suggestions: JobSourcesView["suggestions"] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState<string[]>([]);
  const [hiding, setHiding] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  if (!suggestions.length && !message) return null;

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
    <section className="panel panel-body sources-panel">
      <h2 className="editor-title">
        <Icon name="sparkle" />
        From the jobs you post
      </h2>
      <p className="hint-sm">
        Employers whose jobs are on your board. Click Add and their careers page is found on their website for you.
      </p>
      {suggestions.length > 0 && (
        <ul className="suggest-list">
          {suggestions.map((suggestion) => (
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
    </section>
  );
}
