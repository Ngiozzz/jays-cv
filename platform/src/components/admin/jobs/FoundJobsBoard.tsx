"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { decideManyAction, readInboxItemAction } from "@/app/(admin)/admin/(signed-in)/inbox/actions";
import { checkFindsAction } from "@/app/(admin)/admin/(signed-in)/job-sources/actions";
import { ProgressBar } from "@/components/ai/AiProgress";
import { AskForTokens } from "@/components/admin/AskForTokens";
import { Icon } from "@/components/icons/Icon";
import { NEEDS_CONFIRMING } from "@/modules/inbox/inbox.flags";
import type { FoundJob, FoundStatus } from "@/modules/job-sources/found.view";
import { checkedLabel } from "@/modules/job-sources/labels";
import { DISCARD_CHOICES, FoundJobPanel } from "./FoundJobPanel";

// Three at a time, like Bulk post: quick, without overloading the AI or the websites
const READ_AT_ONCE = 3;

const STATUS_LABEL: Record<FoundStatus, string> = {
  waiting: "Waiting to be read",
  check: "Ready to check",
  published: "Published",
  discarded: "Set aside",
};

const DISCARD_LABEL: Record<string, string> = {
  expired: "deadline passed",
  "not-a-job": "not a job advert",
  scam: "scam",
  duplicate: "same job found twice",
  other: "other",
};

type Filter = "all" | FoundStatus;
type ReadRun = { done: number; total: number; failed: number };
type AiFilter = "" | "job" | "unsure" | "none";
type WarnFilter = "" | "clean" | "warnings";
type Sort = "newest" | "closing" | "source";
// Jobs published or discarded per request (with a progress bar across them)
const DECIDE_CHUNK = 10;

// Every job the sources found lately, what it is, and where it got to
export function FoundJobsBoard({
  jobs,
  unchecked,
  siteUrl,
  today,
  initialSource = "",
}: {
  jobs: FoundJob[];
  unchecked: number;
  siteUrl: string;
  today: string;
  // Opened from one source on Job sources: just its jobs, whatever their state
  initialSource?: string;
}) {
  const router = useRouter();
  // Opens on the jobs waiting for a decision, when there are any
  const [filter, setFilter] = useState<Filter>(() =>
    !initialSource && jobs.some((job) => job.status === "check") ? "check" : "all",
  );
  const [aiFilter, setAiFilter] = useState<AiFilter>("");
  const [warnFilter, setWarnFilter] = useState<WarnFilter>("");
  const [sort, setSort] = useState<Sort>("newest");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<{ done: number; total: number } | null>(null);
  const [bulkReason, setBulkReason] = useState<string>("not-a-job");
  const [source, setSource] = useState(initialSource);
  const [run, setRun] = useState<ReadRun | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [check, setCheck] = useState<{ done: number; total: number } | null>(null);
  // After the AI check: how many real jobs are left for a person, with the way to Bulk post
  const [checkedDone, setCheckedDone] = useState(false);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: jobs.length, waiting: 0, check: 0, published: 0, discarded: 0 };
    for (const job of jobs) result[job.status] += 1;
    return result;
  }, [jobs]);
  const sources = useMemo(() => [...new Set(jobs.map((job) => job.source))].sort(), [jobs]);
  const shown = useMemo(() => {
    const kept = jobs.filter(
      (job) =>
        (filter === "all" || job.status === filter) &&
        (!source || job.source === source) &&
        (!aiFilter || (aiFilter === "none" ? !job.aiCheck : job.aiCheck === aiFilter)) &&
        (!warnFilter || (job.status === "check" && (warnFilter === "clean" ? job.clean : !job.clean))),
    );
    if (sort === "closing") {
      // Soonest deadline first; open-ended last
      return [...kept].sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
    }
    if (sort === "source")
      return [...kept].sort((a, b) => a.source.localeCompare(b.source) || a.title.localeCompare(b.title));
    return kept;
  }, [jobs, filter, source, aiFilter, warnFilter, sort]);
  const pickable = shown.filter((job) => job.status === "check");
  const pickedJobs = jobs.filter((job) => picked.has(job.id) && job.status === "check");
  const allPicked = pickable.length > 0 && pickable.every((job) => picked.has(job.id));
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
      for (const job of pickable) {
        if (on) next.add(job.id);
        else next.delete(job.id);
      }
      return next;
    });
  const pickClean = () => setPicked(new Set(pickable.filter((job) => job.clean).map((job) => job.id)));

  // Publish or discard the given jobs, a few at a time, then say what happened
  const decide = useCallback(
    async (ids: string[], decision: string) => {
      if (!ids.length) return;
      const chosen = jobs.filter((job) => ids.includes(job.id));
      if (decision === "publish") {
        const risky = chosen.filter((job) => job.flags.some((flag) => NEEDS_CONFIRMING.includes(flag.key)));
        const question = risky.length
          ? `${risky.length} of these ${risky.length === 1 ? "has" : "have"} a scam, duplicate or deadline warning (${risky
              .map((job) => job.title)
              .slice(0, 3)
              .join(", ")}${risky.length > 3 ? "…" : ""}). Publish all ${ids.length} anyway?`
          : ids.length > 1
            ? `Publish these ${ids.length} jobs on the website now?`
            : null;
        if (question && !window.confirm(question)) return;
      }
      setMessage(null);
      setDeciding({ done: 0, total: ids.length });
      const done: string[] = [];
      const failed: { title: string; error: string }[] = [];
      for (let start = 0; start < ids.length; start += DECIDE_CHUNK) {
        const chunk = ids.slice(start, start + DECIDE_CHUNK);
        const result = await decideManyAction(chunk, decision).catch(() => ({
          done: [] as string[],
          failed: chunk.map((id) => ({
            id,
            title: jobs.find((job) => job.id === id)?.title ?? "",
            error: "It didn't finish.",
          })),
        }));
        done.push(...result.done);
        failed.push(...result.failed);
        setDeciding({ done: Math.min(start + chunk.length, ids.length), total: ids.length });
      }
      setDeciding(null);
      setPicked((now) => {
        const next = new Set(now);
        for (const id of done) next.delete(id);
        return next;
      });
      const verb = decision === "publish" ? "Published" : "Discarded";
      setMessage(
        [
          done.length ? `${verb} ${done.length} job${done.length === 1 ? "" : "s"}.` : "",
          failed.length
            ? `${failed.length} couldn't be ${decision === "publish" ? "published" : "discarded"}: ${failed
                .map((fail) => `${fail.title} (${fail.error})`)
                .join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      router.refresh();
      return done.length > 0;
    },
    [jobs, router],
  );

  // The full view moves through the list as shown (filters and sort applied)
  const openIndex = openId ? shown.findIndex((job) => job.id === openId) : -1;
  const openJob = openIndex >= 0 ? shown[openIndex] : null;
  const step = useCallback(
    (by: 1 | -1) => {
      const next = shown[openIndex + by];
      if (next) setOpenId(next.id);
    },
    [shown, openIndex],
  );
  const waiting = jobs.filter((job) => job.status === "waiting");

  // Reads every waiting job with the AI, a few at a time, showing real progress
  const readAll = async () => {
    setMessage(null);
    const queue = waiting.map((job) => job.id);
    const state: ReadRun = { done: 0, total: queue.length, failed: 0 };
    setRun({ ...state });
    let stopped: string | null = null;
    const worker = async () => {
      while (queue.length && !stopped) {
        const id = queue.shift()!;
        try {
          const result = await readInboxItemAction(id);
          if (!result.ok) {
            // Out of tokens or AI paused: no point carrying on
            stopped = result.error;
            state.failed += 1;
          }
        } catch {
          state.failed += 1;
        }
        state.done += 1;
        setRun({ ...state });
      }
    };
    await Promise.all(Array.from({ length: READ_AT_ONCE }, worker));
    setRun(null);
    setMessage(
      stopped
        ? `Stopped after ${state.done} of ${state.total}: ${stopped}`
        : `Read ${state.done} job${state.done === 1 ? "" : "s"}. Those ready to check are waiting in Bulk post.`,
    );
    router.refresh();
  };

  // AI check: batch after batch until every found job waiting to be checked has had a second look
  const aiCheck = async () => {
    setMessage(null);
    const state = { done: 0, total: unchecked, setAside: 0 };
    setCheck({ done: 0, total: unchecked });
    let error: string | null = null;
    for (let round = 0; round < 50; round++) {
      const result = await checkFindsAction().catch(() => ({ ok: false as const, error: "The check didn't finish." }));
      if (!result.ok) {
        error = result.error;
        break;
      }
      state.done += result.checked;
      state.setAside += result.setAside;
      setCheck({ done: Math.min(state.done, state.total), total: state.total });
      if (!result.left || !result.checked) break;
    }
    setCheck(null);
    setCheckedDone(true);
    setMessage(
      [
        `AI checked ${state.done} job${state.done === 1 ? "" : "s"}: ${state.setAside} set aside (not a job, closed or staff only), ${state.done - state.setAside} left for you.`,
        error ? `Stopped: ${error}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
    router.refresh();
  };

  return (
    <>
      <div className="board-actions">
        <Link className="btn btn-ghost" href="/admin/job-sources">
          <Icon name="globe" size={18} />
          Job sources
        </Link>
        <Link className="btn btn-ghost" href="/admin/inbox">
          <Icon name="inbox" size={18} />
          Bulk post jobs
        </Link>
        {unchecked > 0 && (
          <button type="button" className="btn btn-primary" onClick={aiCheck} disabled={Boolean(run) || Boolean(check)}>
            <Icon name="shield" size={18} />
            {check ? "Checking…" : `AI check (${unchecked})`}
          </button>
        )}
        {waiting.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={readAll} disabled={Boolean(run)}>
            <Icon name="sparkle" size={18} />
            {run ? "Reading…" : `Read all waiting (${waiting.length})`}
          </button>
        )}
      </div>
      {waiting.length > 0 && !run && (
        <p className="hint-sm">
          The AI reads each job page and fills in the details (about KES 0.15–0.50 a job, from your AI tokens). You can
          leave this page open while it works.
        </p>
      )}
      {run && (
        <ProgressBar
          className="ai-progress found-progress"
          percent={Math.round((run.done / Math.max(1, run.total)) * 100)}
          label={`Reading ${Math.min(run.done + 1, run.total)} of ${run.total}…`}
          ariaLabel="Jobs read"
        />
      )}
      {check && (
        <ProgressBar
          className="ai-progress found-progress"
          percent={Math.round((check.done / Math.max(1, check.total)) * 100)}
          label={`AI checking ${check.done} of ${check.total}…`}
          ariaLabel="Jobs checked by the AI"
        />
      )}
      {unchecked > 0 && !check && (
        <p className="hint-sm">
          AI check takes a second look at the {unchecked} found job{unchecked === 1 ? "" : "s"} waiting for you and sets
          aside the ones that aren&apos;t real, open jobs (lists of links, old or staff-only adverts), with the reason.
          About KES 0.05 a job. You can restore any of them in Bulk post.
        </p>
      )}
      {message && <p className="notice">{message}</p>}
      {checkedDone && !check && counts.check > 0 && (
        <div className="found-next">
          <span>
            <strong>{counts.check}</strong> job{counts.check === 1 ? "" : "s"} ready for you to check and publish.
          </span>
          <Link className="btn btn-primary" href="/admin/inbox">
            Next: check them in Bulk post →
          </Link>
        </div>
      )}
      <AskForTokens message={message} />

      {deciding && (
        <ProgressBar
          className="ai-progress found-progress"
          percent={Math.round((deciding.done / Math.max(1, deciding.total)) * 100)}
          label={`Working through ${deciding.done} of ${deciding.total}…`}
          ariaLabel="Jobs done"
        />
      )}

      <section className="panel">
        <div className="table-tools">
          <nav className="tabs" aria-label="Filter by status">
            {(["all", "waiting", "check", "published", "discarded"] as const).map((key) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {key === "all" ? "All" : STATUS_LABEL[key]}
                <span>{counts[key]}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="found-filters">
          <label>
            <span>Source</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">All sources</option>
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
              <option value="none">Not checked yet</option>
            </select>
          </label>
          <label>
            <span>Warnings</span>
            <select value={warnFilter} onChange={(event) => setWarnFilter(event.target.value as WarnFilter)}>
              <option value="">Any</option>
              <option value="clean">Ready to publish</option>
              <option value="warnings">Needs a look</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="newest">Newest first</option>
              <option value="closing">Closing soonest</option>
              <option value="source">By source</option>
            </select>
          </label>
        </div>

        {pickable.length > 0 && (
          <div className={pickedJobs.length ? "found-bulk is-active" : "found-bulk"}>
            <label className="found-check-all">
              <input type="checkbox" checked={allPicked} onChange={(event) => pickAll(event.target.checked)} />
              {pickedJobs.length ? `${pickedJobs.length} selected` : `Select all ${pickable.length}`}
            </label>
            {!pickedJobs.length && pickable.some((job) => job.clean) && (
              <button type="button" className="link-btn" onClick={pickClean}>
                Select the {pickable.filter((job) => job.clean).length} ready to publish
              </button>
            )}
            {pickedJobs.length > 0 && (
              <div className="found-bulk-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={Boolean(deciding)}
                  onClick={() =>
                    void decide(
                      pickedJobs.map((job) => job.id),
                      "publish",
                    )
                  }
                >
                  <Icon name="upload" size={16} />
                  Publish {pickedJobs.length}
                </button>
                <select
                  aria-label="Why discard"
                  value={bulkReason}
                  onChange={(event) => setBulkReason(event.target.value)}
                >
                  {DISCARD_CHOICES.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={Boolean(deciding)}
                  onClick={() =>
                    void decide(
                      pickedJobs.map((job) => job.id),
                      bulkReason,
                    )
                  }
                >
                  <Icon name="trash" size={16} />
                  Discard {pickedJobs.length}
                </button>
                <button type="button" className="link-btn" onClick={() => setPicked(new Set())}>
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {shown.length ? (
          <div className="table-wrap-admin">
            <table className="admin-table found-table">
              <thead>
                <tr>
                  <th className="found-col-pick">
                    <span className="sr-only">Select</span>
                  </th>
                  <th>Job</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>
                    <span className="sr-only">Links</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((job) => {
                  const warnings = job.flags.filter((flag) => flag.level !== "info");
                  return (
                    <tr key={job.id} className={picked.has(job.id) ? "is-picked" : undefined}>
                      <td className="found-col-pick">
                        {job.status === "check" && (
                          <input
                            type="checkbox"
                            aria-label={`Select ${job.title}`}
                            checked={picked.has(job.id)}
                            onChange={() => togglePick(job.id)}
                          />
                        )}
                      </td>
                      <td>
                        {job.read ? (
                          <button type="button" className="found-title" onClick={() => setOpenId(job.id)}>
                            {job.title}
                          </button>
                        ) : (
                          <strong className="found-unread">{job.title}</strong>
                        )}
                        {job.company && <small className="found-sub">{job.company}</small>}
                        {!job.read && <small className="found-sub">Link words: read the page for the real title</small>}
                        {job.status === "check" && (
                          <span className="found-chips">
                            {job.clean ? (
                              <span className="found-chip ok">Ready to publish</span>
                            ) : (
                              warnings.map((flag) => (
                                <span
                                  key={flag.key + flag.text}
                                  className={`found-chip ${flag.level}`}
                                  title={flag.more}
                                >
                                  {flag.text}
                                </span>
                              ))
                            )}
                          </span>
                        )}
                      </td>
                      <td>
                        {job.source}
                        <small className="found-sub">Found {checkedLabel(job.foundAt).toLowerCase()}</small>
                      </td>
                      <td>
                        <span className={`found-status ${job.status}`}>{STATUS_LABEL[job.status]}</span>
                        {job.status === "discarded" && job.discardReason && (
                          <small className="found-sub">{DISCARD_LABEL[job.discardReason] ?? job.discardReason}</small>
                        )}
                        {job.aiCheck && job.aiCheckReason && (
                          <small className={job.aiCheck === "job" ? "found-sub found-ai ok" : "found-sub found-ai"}>
                            AI: {job.aiCheckReason}
                          </small>
                        )}
                        {job.duplicateOfSlug && (
                          <a
                            className="found-sub found-dup"
                            href={`${siteUrl}/jobs/${job.duplicateOfSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Already on the board ↗
                          </a>
                        )}
                        {job.status === "check" && job.readError && (
                          <small className="found-sub found-problem">{job.readError}</small>
                        )}
                      </td>
                      <td>{job.deadline ?? "–"}</td>
                      <td className="found-links">
                        {job.read && (
                          <button type="button" className="link-btn" onClick={() => setOpenId(job.id)}>
                            View
                          </button>
                        )}
                        {job.pageUrl && (
                          <a href={job.pageUrl} target="_blank" rel="noopener noreferrer">
                            Original ↗
                          </a>
                        )}
                        {job.status === "published" && job.jobSlug && (
                          <a href={`${siteUrl}/jobs/${job.jobSlug}`} target="_blank" rel="noopener noreferrer">
                            On the site ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint-sm found-empty">
            {jobs.length ? "Nothing here with these filters." : "No jobs found yet. Check your sources to find some."}
          </p>
        )}
      </section>

      {openJob && (
        <FoundJobPanel
          key={openJob.id}
          job={openJob}
          today={today}
          position={{ index: openIndex, total: shown.length }}
          busy={Boolean(deciding)}
          onStep={step}
          onClose={() => setOpenId(null)}
          onDecide={async (decision) => {
            // After deciding, move on to the next job in the list (or close at the end)
            const next = shown[openIndex + 1] ?? shown[openIndex - 1] ?? null;
            const ok = await decide([openJob.id], decision);
            if (ok) setOpenId(next && next.id !== openJob.id ? next.id : null);
          }}
        />
      )}
    </>
  );
}
