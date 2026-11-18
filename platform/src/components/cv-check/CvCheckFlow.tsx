"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import {
  followCvCheckAction,
  pretendCheckPaymentAction,
  startCvCheckAction,
} from "@/app/(public)/[tenant]/check/actions";
import { AiProgress } from "@/components/ai/AiProgress";
import { Icon } from "@/components/icons/Icon";
import { formatKes } from "@/lib/money";
import { CHECK_CV_KEEP_HOURS } from "@/modules/cv-check/cv-check";
import type { CheckProgress } from "@/modules/cv-check/cv-check.service";
import { PROMPT_SECONDS, type PretendOutcome } from "@/modules/payments/mpesa";

type Props = { jobSlug: string; jobLabel: string; price: number; businessName: string };

type Started = { checkId: string; paymentId: string; phone: string; amount: number; pretend: boolean };
type Stage =
  | { name: "form"; error?: string; field?: string }
  | ({ name: "waiting"; started: number } & Started)
  | ({ name: "reading" } & Started)
  | { name: "failed"; message: string }
  | { name: "error"; message: string };

// Upload the CV and an M-Pesa number → pay by prompt → the AI reads the CV → the feedback page
export function CvCheckFlow({ jobSlug, jobLabel, price, businessName }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "form" });
  const [busy, startBusy] = useTransition();
  const [cvName, setCvName] = useState("");
  // The clock starts when a prompt is sent (never during render, so the page can be prerendered)
  const [now, setNow] = useState(0);

  const apply = (started: Started, progress: CheckProgress | { ok: false; error: string }) => {
    if ("ok" in progress) return setStage({ name: "error", message: progress.error });
    if (progress.state === "done") return router.push(`/check/${started.checkId}`);
    if (progress.state === "reading") return setStage({ name: "reading", ...started });
    if (progress.state === "failed") return setStage({ name: "failed", message: progress.message });
    if (progress.state === "error") return setStage({ name: "error", message: progress.message });
  };

  // While waiting for M-Pesa (and then the AI), ask the server every few seconds
  const following = stage.name === "waiting" || stage.name === "reading" ? stage : null;
  useEffect(() => {
    if (!following) return;
    const started: Started = following;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      apply(started, await followCvCheckAction(started.checkId, started.paymentId));
    }, 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when a new check starts
  }, [following?.checkId, following?.name]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("jobSlug", jobSlug);
    startBusy(async () => {
      const result = await startCvCheckAction(data);
      if (!result.ok) setStage({ name: "form", error: result.error, field: result.field });
      else {
        const started = Date.now();
        setNow(started);
        setStage({ name: "waiting", started, ...result });
      }
    });
  };

  const answer = (started: Started, outcome: PretendOutcome) =>
    startBusy(async () => apply(started, await pretendCheckPaymentAction(started.checkId, started.paymentId, outcome)));

  const step = stage.name === "reading" ? 1 : stage.name === "waiting" ? 0 : 0;
  const rail = (
    <ol className="steps-rail" aria-label="Steps">
      {["Upload and pay", "Reading your CV", "Your feedback"].map((label, i) => (
        <li key={label} className={i < step ? "done" : i === step ? "now" : undefined}>
          <i />
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );

  if (stage.name === "reading")
    return (
      <>
        {rail}
        <div className="card panel check-reading" role="status">
          <h2>Reading your CV</h2>
          <p className="hint">
            Payment received. We&apos;re comparing your CV with {jobLabel}. This takes about half a minute.
          </p>
          <AiProgress
            active
            seconds={30}
            steps={["Opening your CV", "Reading your CV", "Comparing it with the job", "Writing your feedback"]}
          />
        </div>
      </>
    );

  if (stage.name === "waiting") {
    const left = Math.max(0, PROMPT_SECONDS - Math.floor((now - stage.started) / 1000));
    return (
      <>
        {rail}
        <div className="card panel ps-wait" role="status">
          <div className="phone-wait">
            <div className="phone-mini" aria-hidden="true">
              <div className="stk">
                Pay Ksh{stage.amount.toLocaleString("en-KE")}.00 to {businessName}, account CVCHECK?
                <span className="pin">••••</span>
              </div>
            </div>
            <div>
              <h2>Check your phone</h2>
              <p className="hint">
                Enter your M-Pesa PIN on the prompt sent to <b>{stage.phone}</b>. This page moves on by itself once
                it&apos;s paid.
              </p>
              <p className="ps-count num">
                {left > 0 ? `Waiting for M-Pesa… 0:${String(left).padStart(2, "0")}` : "Still waiting for M-Pesa…"}
              </p>
            </div>
          </div>
          {stage.pretend && (
            <div className="ps-sim">
              <small>Test mode: you play the client&apos;s phone</small>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => answer(stage, "paid")}
                >
                  Entered PIN
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => answer(stage, "cancelled")}
                >
                  Cancelled
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => answer(stage, "noFunds")}
                >
                  Not enough money
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  if (stage.name === "failed" || stage.name === "error")
    return (
      <>
        {rail}
        <div className="card panel ps-failed" role="alert">
          <h2>{stage.name === "failed" ? "Payment didn't go through" : "Something went wrong"}</h2>
          <p className="hint">{stage.message}</p>
          <button type="button" className="btn btn-primary" onClick={() => setStage({ name: "form" })}>
            Try again
          </button>
        </div>
      </>
    );

  const fieldError = (field: string) =>
    stage.error &&
    stage.field === field && (
      <small className="field-error" role="alert">
        {stage.error}
      </small>
    );

  return (
    <>
      {rail}
      <form className="card panel check-form" noValidate onSubmit={submit}>
        <h2>Upload your CV</h2>
        <p className="hint">The CV you&apos;d send for this job, as it is today.</p>
        <label className={cvName ? "cv-drop has-file" : "cv-drop"}>
          <input
            type="file"
            name="cv"
            accept="application/pdf,image/*"
            onChange={(event) => setCvName(event.target.files?.[0]?.name ?? "")}
          />
          <Icon name={cvName ? "check" : "upload"} />
          <span>
            <strong>{cvName || "Choose your CV or drop it here"}</strong>
            <small>A PDF or a clear photo of it · up to 10 MB</small>
          </span>
        </label>
        {fieldError("cv")}
        <label className="in" htmlFor="check-phone">
          <span className="label">M-Pesa number</span>
          <span className="field">
            <input
              id="check-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="07XX XXX XXX"
            />
          </span>
        </label>
        {fieldError("phone")}
        {stage.error && !stage.field && (
          <p className="form-error od-error" role="alert">
            {stage.error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? "Sending the M-Pesa prompt…" : `Pay ${formatKes(price)} and check my CV`}
        </button>
        <p className="check-privacy">
          <Icon name="lock" size={16} />
          <span>
            Our AI reads your CV to give you feedback. It&apos;s kept privately for {CHECK_CV_KEEP_HOURS} hours in case
            you&apos;d like {businessName} to tailor it for this job, then deleted. Nobody at {businessName} sees it
            unless you order.
          </span>
        </p>
      </form>
    </>
  );
}
