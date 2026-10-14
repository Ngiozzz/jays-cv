"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  checkPromptAction,
  pretendAnswerAction,
  sendPromptAction,
  showAccountAction,
} from "@/app/(public)/[tenant]/track/pay-actions";
import { PROMPT_SECONDS, type PretendOutcome } from "@/modules/payments/mpesa";

export type PayInfo = {
  ref: string;
  // What's still to pay, in shillings
  amountDue: number;
  // The client's number from the order, to start the prompt with (they can change it)
  phone: string;
  paybill: string;
  businessName: string;
  // No Safaricom keys yet: the tester answers the pretend prompt on screen
  pretend: boolean;
};

type Stage =
  | { name: "form"; error?: string }
  | { name: "waiting"; paymentId: string; phone: string; started: number }
  | { name: "paid"; receipt: string }
  | { name: "failed"; message: string };

// "Working…" for as long as one request takes (not tied to the page refresh that may follow)
function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };
  return [busy, run] as const;
}

const kes = (amount: number) => `KES ${amount.toLocaleString("en-KE")}`;
const POLL_MS = 3000;

// How the client pays: a prompt on their phone (they only enter their PIN), or the Paybill in their
// M-Pesa app, with the account number shown when they ask for it.
export function PayBox({ info }: { info: PayInfo }) {
  const [method, setMethod] = useState<"prompt" | "paybill">("prompt");
  return (
    <div className="ps-box mp-dialog pay-box">
      {info.pretend && <div className="ps-test">TEST MODE · pretend M-Pesa, no real money moves</div>}
      <header className="ps-head">
        <span className="mp-logo" aria-hidden="true">
          M-PESA
        </span>
        <div>
          <strong>Pay {info.businessName}</strong>
          <small>Order {info.ref}</small>
        </div>
        <div className="ps-amount">
          <small>Amount</small>
          <strong>{kes(info.amountDue)}</strong>
        </div>
      </header>
      <div className="ps-tabs" role="group" aria-label="How would you like to pay?">
        <button
          type="button"
          className={method === "prompt" ? "active" : undefined}
          aria-pressed={method === "prompt"}
          onClick={() => setMethod("prompt")}
        >
          📲 Prompt on my phone
        </button>
        <button
          type="button"
          className={method === "paybill" ? "active" : undefined}
          aria-pressed={method === "paybill"}
          onClick={() => setMethod("paybill")}
        >
          🏦 Pay via Paybill
        </button>
      </div>
      <div className="ps-body">
        {method === "prompt" ? (
          <PromptPay info={info} onPaybill={() => setMethod("paybill")} />
        ) : (
          <PaybillPay info={info} />
        )}
      </div>
      <footer className="ps-foot">
        🔒 Paid directly to {info.businessName} by M-Pesa · Paybill <b>{info.paybill}</b> · no middleman
      </footer>
    </div>
  );
}

function PromptPay({ info, onPaybill }: { info: PayInfo; onPaybill: () => void }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "form" });
  const [phone, setPhone] = useState(info.phone);
  const [busy, startBusy] = useBusy();
  const [now, setNow] = useState(() => Date.now());

  const settle = (result: Awaited<ReturnType<typeof checkPromptAction>>) => {
    if ("ok" in result) setStage({ name: "failed", message: result.error });
    else if (result.state === "paid") {
      setStage({ name: "paid", receipt: result.receipt });
      // The page behind moves on to "Payment received"
      setTimeout(() => router.refresh(), 1500);
    } else if (result.state === "failed") setStage({ name: "failed", message: result.message });
  };

  // While waiting, ask every few seconds how the prompt went, and run the countdown
  useEffect(() => {
    if (stage.name !== "waiting") return;
    const poll = setInterval(async () => settle(await checkPromptAction(info.ref, stage.paymentId)), POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when a new prompt starts
  }, [stage.name === "waiting" ? stage.paymentId : null]);

  const send = () =>
    startBusy(async () => {
      const result = await sendPromptAction(info.ref, phone);
      if (!result.ok) setStage({ name: "form", error: result.error });
      else setStage({ name: "waiting", paymentId: result.paymentId, phone: result.phone, started: Date.now() });
    });

  const answer = (paymentId: string, outcome: PretendOutcome) =>
    startBusy(async () => settle(await pretendAnswerAction(info.ref, paymentId, outcome)));

  if (stage.name === "paid")
    return (
      <div className="ps-done" role="status">
        <span aria-hidden="true">✓</span>
        <strong>Payment received</strong>
        <p>
          {kes(info.amountDue)} paid by M-Pesa.
          <br />
          M-Pesa code <b>{stage.receipt}</b>
        </p>
      </div>
    );

  if (stage.name === "failed")
    return (
      <div className="ps-failed" role="alert">
        <strong>Payment didn&apos;t go through</strong>
        <p>{stage.message}</p>
        <button type="button" className="ps-pay" onClick={() => setStage({ name: "form" })}>
          Try again
        </button>
        <button type="button" className="ps-link mp-alt" onClick={onPaybill}>
          Pay via Paybill instead
        </button>
      </div>
    );

  if (stage.name === "waiting") {
    const left = Math.max(0, PROMPT_SECONDS - Math.floor((now - stage.started) / 1000));
    return (
      <div className="ps-wait" role="status">
        <div className="ps-phone-art" aria-hidden="true">
          <span>M-PESA</span>
          <small>
            Do you want to pay Ksh{info.amountDue.toLocaleString("en-KE")}.00 to {info.businessName} account no.{" "}
            {info.ref.replace(/^\D+-?/, "")}? Enter M-PESA PIN
          </small>
        </div>
        <strong>Check your phone</strong>
        <p>
          Enter your M-Pesa PIN on the prompt sent to <b>{stage.phone}</b>.
        </p>
        <p className="ps-count">
          {left > 0 ? `Waiting for M-Pesa… 0:${String(left).padStart(2, "0")}` : "Still waiting for M-Pesa…"}
        </p>
        {info.pretend && (
          <div className="ps-sim">
            <small>Test mode: you play the client&apos;s phone</small>
            <button type="button" className="ps-pay" disabled={busy} onClick={() => answer(stage.paymentId, "paid")}>
              ✓ Entered PIN
            </button>
            <div className="mp-sim-row">
              <button
                type="button"
                className="ps-link"
                disabled={busy}
                onClick={() => answer(stage.paymentId, "cancelled")}
              >
                Cancelled
              </button>
              <button
                type="button"
                className="ps-link"
                disabled={busy}
                onClick={() => answer(stage.paymentId, "noFunds")}
              >
                Not enough money
              </button>
              <button
                type="button"
                className="ps-link"
                disabled={busy}
                onClick={() => answer(stage.paymentId, "timeout")}
              >
                No answer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="ps-p">Enter your M-Pesa number. A prompt pops up on your phone: just enter your PIN.</p>
      <label className="ps-label" htmlFor="pay-phone">
        M-Pesa phone number
      </label>
      <input
        id="pay-phone"
        className={stage.error ? "ps-input bad" : "ps-input"}
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="0712 345 678"
        aria-describedby={stage.error ? "pay-error" : undefined}
      />
      {stage.error && (
        <p className="ps-err" id="pay-error" role="alert">
          {stage.error}
        </p>
      )}
      <button type="button" className="ps-pay" disabled={busy} onClick={send}>
        {busy ? "Sending the prompt…" : `Pay ${kes(info.amountDue)}`}
      </button>
      <p className="mp-small">Paying for someone else? Change the number to theirs. No prompt? Use Pay via Paybill.</p>
    </>
  );
}

function PaybillPay({ info }: { info: PayInfo }) {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, startBusy] = useBusy();

  const copy = async (what: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
    } catch {
      setCopied(null);
    }
  };
  const reveal = () =>
    startBusy(async () => {
      const result = await showAccountAction(info.ref);
      if (result.ok) setAccount(result.account);
      else setError(result.error);
    });

  return (
    <>
      <ol className="mp-steps">
        <li>
          On your phone: <b>M-PESA</b> › <b>Lipa na M-PESA</b> › <b>Pay Bill</b>
        </li>
        <li>
          Business number: <b className="mp-copy">{info.paybill}</b>{" "}
          <button type="button" className="mp-c" onClick={() => copy("paybill", info.paybill)}>
            {copied === "paybill" ? "Copied" : "Copy"}
          </button>
        </li>
        <li>
          Account number:{" "}
          {account ? (
            <>
              <b className="mp-copy">{account}</b>{" "}
              <button type="button" className="mp-c" onClick={() => copy("account", account)}>
                {copied === "account" ? "Copied" : "Copy"}
              </button>
            </>
          ) : (
            <>
              <b className="mp-copy" aria-hidden="true">
                ••••
              </b>{" "}
              <button type="button" className="mp-c" disabled={busy} onClick={reveal}>
                Show account number
              </button>
            </>
          )}
        </li>
        <li>
          Amount: <b>{kes(info.amountDue)}</b>, then enter your PIN
        </li>
      </ol>
      {error && (
        <p className="ps-err" role="alert">
          {error}
        </p>
      )}
      {account && (
        <p className="mp-small">
          Type exactly <b>{account}</b> as the account number, not your name, so we match your payment to order{" "}
          {info.ref} straight away.
        </p>
      )}
      {info.pretend && (
        <p className="mp-sim-note">
          Test mode: Paybill payments aren&apos;t picked up yet. Use the prompt to test paying, or the owner can record
          the payment by hand.
        </p>
      )}
    </>
  );
}
