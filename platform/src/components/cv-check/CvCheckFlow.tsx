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
  const [now, setNow] = useState(() => Date.now());

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
      else setStage({ name: "waiting", started: Date.now(), ...result });
    });
  };

  const answer = (started: Started, outcome: PretendOutcome) =>
    startBusy(async () => apply(started, await pretendCheckPaymentAction(started.checkId, started.paymentId, outcome)));

  if (stage.name === "reading")
    return (
      <div className="ps-wait check-reading" role="status">
        <strong>Reading your CV…</strong>
        <p>Payment received. We&apos;re comparing your CV with {jobLabel}. This takes about half a minute.</p>
        <AiProgress
          active
          seconds={30}
          steps={["Opening your CV", "Reading your CV", "Comparing it with the job", "Writing your feedback"]}
        />
      </div>
    );

  if (stage.name === "waiting") {
    const left = Math.max(0, PROMPT_SECONDS - Math.floor((now - stage.started) / 1000));
    return (
      <div className="ps-wait" role="status">
        <div className="ps-phone-art" aria-hidden="true">
          <span>M-PESA</span>
          <small>
            Do you want to pay Ksh{stage.amount.toLocaleString("en-KE")}.00 to {businessName} account no. CVCHECK? Enter
            M-PESA PIN
          </small>
        </div>
        <strong>Check your phone</strong>
        <p>
          Enter your M-Pesa PIN on the prompt sent to <b>{stage.phone}</b>.
        </p>
        <p className="ps-count">
          {left > 0 ? `Waiting for M-Pesa… 0:${String(left).padStart(2, "0")}` : "Still waiting for M-Pesa…"}
        </p>
        {stage.pretend && (
          <div className="ps-sim">
            <small>Test mode: you play the client&apos;s phone</small>
            <button type="button" className="ps-pay" disabled={busy} onClick={() => answer(stage, "paid")}>
              ✓ Entered PIN
            </button>
            <div className="mp-sim-row">
              <button type="button" className="ps-link" disabled={busy} onClick={() => answer(stage, "cancelled")}>
                Cancelled
              </button>
              <button type="button" className="ps-link" disabled={busy} onClick={() => answer(stage, "noFunds")}>
                Not enough money
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (stage.name === "failed" || stage.name === "error")
    return (
      <div className="ps-failed" role="alert">
        <strong>{stage.name === "failed" ? "Payment didn't go through" : "Something went wrong"}</strong>
        <p>{stage.message}</p>
        <button type="button" className="ps-pay" onClick={() => setStage({ name: "form" })}>
          Try again
        </button>
      </div>
    );

  const fieldError = (field: string) =>
    stage.error &&
    stage.field === field && (
      <small className="field-error" role="alert">
        {stage.error}
      </small>
    );

  return (
    <form className="check-form" noValidate onSubmit={submit}>
      <label className={cvName ? "cv-drop has-file" : "cv-drop"}>
        <input
          type="file"
          name="cv"
          accept="application/pdf,image/*"
          onChange={(event) => setCvName(event.target.files?.[0]?.name ?? "")}
        />
        <Icon name="upload" />
        <span>
          <strong>{cvName || "Upload your CV"}</strong>
          <small>A PDF or a clear photo of it · up to 10 MB</small>
        </span>
      </label>
      {fieldError("cv")}
      <div className="od-field">
        <label htmlFor="check-phone">
          M-Pesa number <em>*</em>
        </label>
        <input id="check-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" />
        {fieldError("phone")}
      </div>
      {stage.error && !stage.field && (
        <p className="od-error" role="alert">
          {stage.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
        <Icon name="phone" />
        {busy ? "Sending the M-Pesa prompt…" : `Pay ${formatKes(price)} & check my CV`}
      </button>
      <p className="check-privacy">
        <Icon name="lock" />
        Our AI reads your CV once to give you feedback, then it&apos;s deleted. Nobody at {businessName} sees it.
      </p>
    </form>
  );
}
