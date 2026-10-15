"use client";

import { useRef, useState, useTransition } from "react";
import { runWriterToolAction } from "@/app/(admin)/admin/(signed-in)/orders/actions";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/icons/Icon";
import type { CvAnalysis, FinalCheck, SummaryDraft, WriterTool } from "@/modules/ai/writer-tools";
import type { AiHelperResult } from "@/modules/orders/ai-helper.service";

type Props = {
  orderId: string;
  results: AiHelperResult[];
  clientCvName: string | null;
  latestDraftName: string | null;
  aiPretend: boolean;
};

const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png,.webp";

// The writer's AI helper: three tools that read a CV and help, never write it. Each keeps its last
// result, so the writer (or Jay) can come back to it without paying again.
export function AiHelper({ orderId, results, clientCvName, latestDraftName, aiPretend }: Props) {
  const latest = (tool: WriterTool) => results.find((result) => result.tool === tool) ?? null;
  return (
    <section className="panel ai-helper">
      <div className="panel-head">
        <h2>
          <Icon name="sparkle" /> AI helper
        </h2>
      </div>
      <div className="panel-body">
        <p className="hint-sm">
          The AI reads the CV and helps you: it never writes the CV. Check everything before you use it.
          {aiPretend && " (Pretend mode: sample answers until the Claude API key is added.)"}
        </p>
        <Tool
          orderId={orderId}
          tool="analysis"
          title="Analyse the client's CV"
          what="Score, what to keep, what to fix first, what to ask the client and keywords for the job."
          reads={clientCvName ? `Reads the client's CV: ${clientCvName}` : "The client didn't send a CV: choose one to analyse."}
          needsFile={!clientCvName}
          initial={latest("analysis")}
          render={(data) => <Analysis data={data as CvAnalysis} />}
        />
        <Tool
          orderId={orderId}
          tool="summary"
          title="Draft the professional summary"
          what="Three versions of the profile at the top of the CV, using only facts from the client's CV."
          reads={clientCvName ? `Reads the client's CV: ${clientCvName}` : "The client didn't send a CV: choose one to read."}
          needsFile={!clientCvName}
          initial={latest("summary")}
          render={(data) => <Summary data={data as SummaryDraft} />}
        />
        <Tool
          orderId={orderId}
          tool="final-check"
          title="Final check before sending"
          what="Spelling, dates, contact details, consistency and anything screening software can't read."
          reads={
            latestDraftName
              ? `Checks your last draft (${latestDraftName}), or choose the new one before sending it.`
              : "Choose your draft (PDF or Word) before you send it."
          }
          needsFile={!latestDraftName}
          initial={latest("final-check")}
          render={(data) => <Check data={data as FinalCheck} />}
        />
      </div>
    </section>
  );
}

type ToolProps = {
  orderId: string;
  tool: WriterTool;
  title: string;
  what: string;
  reads: string;
  needsFile: boolean;
  initial: AiHelperResult | null;
  render: (data: unknown) => React.ReactNode;
};

function Tool({ orderId, tool, title, what, reads, needsFile, initial, render }: ToolProps) {
  const [result, setResult] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [running, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  const run = () => {
    const form = new FormData();
    const picked = file.current?.files?.[0];
    if (picked) form.set("file", picked);
    else if (needsFile) {
      setError("Choose a file first.");
      return;
    }
    setError(null);
    start(async () => {
      const outcome = await runWriterToolAction(orderId, tool, form);
      if (outcome.ok) setResult(outcome.result);
      else setError(outcome.error);
    });
  };

  return (
    <div className="ai-tool">
      <div className="ai-tool-head">
        <div>
          <h3>{title}</h3>
          <p>{what}</p>
          <small>{chosen ? `Will read: ${chosen}` : reads}</small>
        </div>
        <div className="ai-tool-actions">
          <button type="button" className="btn btn-ai btn-sm" onClick={run} disabled={running}>
            <Icon name="sparkle" />
            {running ? "Reading… (about 20 seconds)" : result ? "Run again" : "Run"}
          </button>
          <label className="ai-tool-file">
            <input
              ref={file}
              type="file"
              accept={ACCEPT}
              onChange={(event) => setChosen(event.target.files?.[0]?.name ?? null)}
            />
            {chosen ? "Choose another file" : needsFile ? "Choose file" : "Use a different file"}
          </label>
        </div>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="ai-tool-result">
          {render(result.data)}
          <small className="ai-tool-meta">
            {result.by} · {new Date(result.at).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" })} ·
            read {result.fileName}
          </small>
        </div>
      )}
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone?: "good" | "bad" | "ask" }) {
  if (!items.length) return null;
  return (
    <div className={`ai-list ${tone ?? ""}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Analysis({ data }: { data: CvAnalysis }) {
  const tone = data.score >= 70 ? "good" : data.score >= 45 ? "fair" : "low";
  return (
    <>
      <p className="ai-verdict">
        <span className={`ai-score ${tone}`}>{data.score}/100</span>
        {data.verdict}
      </p>
      <div className="ai-lists">
        <List title="Fix first" items={data.fixFirst} tone="bad" />
        <List title="Worth keeping" items={data.strengths} tone="good" />
        <List title="Ask the client" items={data.askClient} tone="ask" />
      </div>
      {data.keywords.length > 0 && (
        <div className="ai-keywords">
          <h4>Keywords to work in</h4>
          {data.keywords.map((keyword) => (
            <span key={keyword} className="tag">
              {keyword}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function Summary({ data }: { data: SummaryDraft }) {
  return (
    <>
      {data.options.map((option) => (
        <div key={option.style} className="ai-option">
          <div className="ai-option-head">
            <strong>{option.style}</strong>
            <CopyButton text={option.text} label="Copy" className="btn btn-ghost btn-sm" />
          </div>
          <p>{option.text}</p>
        </div>
      ))}
      <List title="Confirm with the client (the [brackets])" items={data.toConfirm} tone="ask" />
    </>
  );
}

function Check({ data }: { data: FinalCheck }) {
  return (
    <>
      <p className={data.readyToSend ? "ai-ready ok" : "ai-ready fix"}>
        <Icon name={data.readyToSend ? "check" : "alert"} />
        <span>
          <strong>{data.readyToSend ? "Ready to send" : "Fix before sending"}.</strong> {data.verdict}
        </span>
      </p>
      {data.issues.length > 0 && (
        <table className="ai-issues">
          <thead>
            <tr>
              <th>What</th>
              <th>Where</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            {data.issues.map((issue, i) => (
              <tr key={i}>
                <td>
                  <span className="mini-pill">{issue.kind}</span>
                </td>
                <td>{issue.where}</td>
                <td>{issue.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
