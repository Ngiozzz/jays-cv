"use client";

import Link from "next/link";
import { useState } from "react";
import { STAGES, type ProgressRow, type StageKey } from "@/modules/dashboard/dashboard";

export type ProgressCv = {
  ref: string;
  clientName: string;
  itemName: string;
  stage: Exclude<StageKey, "DELIVERED">;
  due: { text: string; tone: string };
};
export type OpenSummary = { count: number; oldestRef: string; oldestWaiting: string; refs: string };

type Props = {
  owner: boolean;
  me: string;
  rows: ProgressRow[];
  mine: ProgressCv[];
  // Paid orders nobody has accepted: the owner's alert (writers have their own "Orders you can accept")
  open: OpenSummary | null;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const STEP: Record<ProgressCv["stage"], number> = { WRITING: 0, DRAFT_SENT: 1, REVISIONS: 2 };

// CVs by stage: the whole team for the owner, their own for a writer. Never colour alone: every
// segment carries its number, and the table view says the same in words.
export function ProgressPanel({ owner, me, rows, mine, open }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const max = Math.max(1, ...rows.map((row) => row.total));
  const totals = STAGES.map((_, i) => rows.reduce((n, row) => n + row.stages[i].refs.length, 0));
  const anything = rows.some((row) => row.total > 0);
  const firstName = rows[0]?.name.split(" ")[0] ?? "";

  return (
    <section className="panel progress-panel">
      <div className="panel-head">
        <div>
          <h2>{owner ? "Team CV progress" : `Your CVs, ${firstName}`}</h2>
          <p className="hint-sm" style={{ margin: "2px 0 0" }}>
            {owner ? "Every writer's CVs by stage. Hover a bar for the orders." : "CVs you've accepted, by stage"}
          </p>
        </div>
        <div className="seg-toggle" role="group" aria-label="Show as">
          {(["chart", "table"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
              {v === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-body">
        {open && (
          <Link className="open-alert" href="/admin/orders?status=open">
            <span className="oa-icon" aria-hidden="true">
              ⚠
            </span>
            <span>
              <strong>{open.count === 1 ? "1 paid order is" : `${open.count} paid orders are`} not accepted yet</strong>
              <small>
                Longest waiting: {open.oldestRef} · {open.oldestWaiting}. Remind the team or reassign.
              </small>
            </span>
            <span className="oa-cta">View →</span>
          </Link>
        )}

        {(anything || open) && (
          <ul className="prog-legend">
            {STAGES.map((stage, i) => (
              <li key={stage.key}>
                <span className="sw" style={{ background: stage.color }}></span>
                {stage.label} <b>{totals[i]}</b>
              </li>
            ))}
            {open && view === "chart" && (
              <li>
                <span className="sw" style={{ background: "#d03b3b" }}></span>⚠ Not accepted <b>{open.count}</b>
              </li>
            )}
          </ul>
        )}

        {open && view === "chart" && (
          <div className="prog-chart prog-open-chart">
            <div className="prog-row prog-open">
              <span className="prog-who">⚠ Not accepted</span>
              <div className="prog-track">
                <div className="prog-bar" style={{ width: "100%" }}>
                  <Link
                    className="prog-seg seg-open"
                    style={{ flex: 1 }}
                    href="/admin/orders?status=open"
                    title={`Paid, waiting for a writer: ${open.refs}`}
                  >
                    Waiting for a writer · oldest {open.oldestWaiting}
                  </Link>
                </div>
              </div>
              <span className="prog-total">{open.count}</span>
            </div>
          </div>
        )}

        {!anything ? (
          <p className="empty-note">{owner ? "No CVs are in progress." : "You have no CVs in progress."}</p>
        ) : view === "table" ? (
          <div className="table-wrap-admin">
            <table className="admin-table prog-table">
              <thead>
                <tr>
                  <th>{owner ? "Writer" : ""}</th>
                  {STAGES.map((stage) => (
                    <th key={stage.key}>{stage.label}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.name}</th>
                    {row.stages.map((stage) => (
                      <td key={stage.key}>{stage.refs.length}</td>
                    ))}
                    <td>
                      <b>{row.total}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="prog-chart">
            {rows.map((row) => (
              <div className="prog-row" key={row.id}>
                <span className="prog-who">
                  {row.name}
                  {row.id === me && owner ? <small> (you)</small> : null}
                </span>
                <div className="prog-track">
                  <div className="prog-bar" style={{ width: `${(row.total / max) * 100}%` }}>
                    {row.stages.map((stage, i) =>
                      stage.refs.length ? (
                        <Link
                          key={stage.key}
                          className="prog-seg"
                          href={
                            owner ? `/admin/orders?writer=${encodeURIComponent(row.id)}` : "/admin/orders?status=mine"
                          }
                          style={{ flex: stage.refs.length, background: STAGES[i].color, color: STAGES[i].ink }}
                          title={`${row.name} · ${STAGES[i].label}: ${stage.refs.join(", ")}`}
                          aria-label={`${row.name}, ${STAGES[i].label}: ${plural(stage.refs.length, "order")}`}
                        >
                          {stage.refs.length}
                        </Link>
                      ) : null,
                    )}
                  </div>
                </div>
                <span className="prog-total">{row.total}</span>
              </div>
            ))}
          </div>
        )}

        {mine.length > 0 && (
          <>
            <h3 className="prog-list-title">{owner ? "CVs you've accepted" : "Your CVs in progress"}</h3>
            <ul className="prog-list">
              {mine.map((cv) => (
                <li key={cv.ref}>
                  <Link href={`/admin/orders/${cv.ref}`}>
                    <strong>{cv.ref}</strong> · {cv.clientName}
                    <small>{cv.itemName}</small>
                  </Link>
                  <div className="mini-track" aria-label={`Stage: ${STAGES[STEP[cv.stage]].label}`}>
                    {STAGES.map((stage, i) => (
                      <span key={stage.key} style={{ background: i <= STEP[cv.stage] ? stage.color : "var(--line)" }} />
                    ))}
                    <em>{STAGES[STEP[cv.stage]].label}</em>
                  </div>
                  <DueFlag due={cv.due} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function DueFlag({ due }: { due: ProgressCv["due"] }) {
  if (due.tone === "late") return <span className="flag critical">⚠ {due.text}</span>;
  if (due.tone === "soon") return <span className="flag warning">⏱ {due.text}</span>;
  return <span className="flag">{due.text.replace(/ ·.*/, "")}</span>;
}
