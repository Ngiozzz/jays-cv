"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { readInboxItemAction } from "@/app/(admin)/admin/(signed-in)/inbox/actions";
import { ProgressBar } from "@/components/ai/AiProgress";
import { Icon } from "@/components/icons/Icon";
import type { FoundJob, FoundStatus } from "@/modules/job-sources/found.view";
import { checkedLabel } from "@/modules/job-sources/labels";

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

// Every job the sources found lately, what it is, and where it got to
export function FoundJobsBoard({ jobs, siteUrl }: { jobs: FoundJob[]; siteUrl: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [source, setSource] = useState("");
  const [run, setRun] = useState<ReadRun | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: jobs.length, waiting: 0, check: 0, published: 0, discarded: 0 };
    for (const job of jobs) result[job.status] += 1;
    return result;
  }, [jobs]);
  const sources = useMemo(() => [...new Set(jobs.map((job) => job.source))].sort(), [jobs]);
  const shown = jobs.filter((job) => (filter === "all" || job.status === filter) && (!source || job.source === source));
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
      {message && <p className="notice">{message}</p>}

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
          <label className="found-source">
            <span className="sr-only">Source</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">All sources</option>
              {sources.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {shown.length ? (
          <div className="table-wrap-admin">
            <table className="admin-table found-table">
              <thead>
                <tr>
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
                {shown.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <strong className={job.read ? undefined : "found-unread"}>{job.title}</strong>
                      {job.company && <small className="found-sub">{job.company}</small>}
                      {!job.read && <small className="found-sub">Link words: read the page for the real title</small>}
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
                      {job.pageUrl && (
                        <a href={job.pageUrl} target="_blank" rel="noopener noreferrer">
                          Original ↗
                        </a>
                      )}
                      {job.status === "published" && job.jobSlug ? (
                        <a href={`${siteUrl}/jobs/${job.jobSlug}`} target="_blank" rel="noopener noreferrer">
                          On the site ↗
                        </a>
                      ) : (
                        job.status !== "waiting" && <Link href={`/admin/inbox?item=${job.id}`}>Open in Bulk post</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint-sm found-empty">
            {jobs.length ? "Nothing here with these filters." : "No jobs found yet. Check your sources to find some."}
          </p>
        )}
      </section>
    </>
  );
}
