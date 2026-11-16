"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { cancelTokenRequestAction, requestTokensAction } from "@/app/(admin)/admin/(signed-in)/actions";
import { Icon } from "@/components/icons/Icon";
import { formatNumber } from "@/lib/money";
import { MAX_TOKEN_REQUEST, MIN_TOKEN_REQUEST, TOKEN_REQUEST_CHOICES } from "@/modules/ai/token-requests";

// The owner asks the developer for more AI tokens; the request shows in the developer's Command Center
export function RequestTokensButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} />
        Request tokens
      </button>
      {open && <RequestDialog onClose={() => setOpen(false)} />}
    </>
  );
}

// Also opened from "Ask for more tokens" wherever the AI says the tokens have run out
export function RequestDialog({ onClose, onSent }: { onClose: () => void; onSent?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [other, setOther] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const result = await requestTokensAction(new FormData(event.currentTarget));
    setBusy(false);
    if (result.ok) {
      dialog.current?.close();
      onSent?.();
    } else setErrors(result.fieldErrors);
  };

  const error = (name: string) =>
    errors[name] && (
      <small className="field-error" role="alert">
        {errors[name]}
      </small>
    );

  return (
    <dialog ref={dialog} className="admin-dialog" onClose={onClose} aria-labelledby="tokens-title">
      <form className="dialog-body" noValidate onSubmit={submit}>
        <h2 id="tokens-title">Request more AI tokens</h2>
        <p>Your developer gets the request and adds the tokens. Your balance goes up as soon as they do.</p>
        {error("form")}
        <div className="method-picker" role="radiogroup" aria-label="How many tokens">
          {TOKEN_REQUEST_CHOICES.map((tokens) => (
            <label key={tokens}>
              <input
                type="radio"
                name="tokens"
                value={tokens}
                defaultChecked={tokens === 1_000_000}
                onChange={() => setOther(false)}
              />
              {formatNumber(tokens)}
            </label>
          ))}
          <label>
            <input type="radio" name="tokens" value="other" onChange={() => setOther(true)} />
            Other amount
          </label>
        </div>
        {other && (
          <div className="f">
            <label htmlFor="tr-other">How many tokens?</label>
            <input
              id="tr-other"
              name="otherTokens"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 3,000,000"
              autoFocus
            />
            <small>
              Between {formatNumber(MIN_TOKEN_REQUEST)} and {formatNumber(MAX_TOKEN_REQUEST)}.
            </small>
          </div>
        )}
        {error("tokens")}
        <div className={errors.note ? "f invalid" : "f"}>
          <label htmlFor="tr-note">Note (optional)</label>
          <textarea
            id="tr-note"
            name="note"
            rows={2}
            maxLength={200}
            placeholder="e.g. Big batch of job posters this week"
          />
          <small>Don&apos;t put client details here.</small>
          {error("note")}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

const requestDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short" });

// A request waiting for the developer, with a way to take it back
export function OpenTokenRequest(props: { id: string; tokens: number; note: string | null; createdAt: Date }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cancel = () => {
    if (!window.confirm("Cancel your request for more tokens?")) return;
    startTransition(async () => {
      const result = await cancelTokenRequestAction(props.id);
      setError(result.ok ? null : result.error);
    });
  };
  return (
    <div className="token-request">
      <Icon name="clock" />
      <div>
        <strong>
          You asked for {formatNumber(props.tokens)} tokens on {requestDate(props.createdAt)}
        </strong>
        <span>Waiting for your developer to add them.{props.note && <> Note: &ldquo;{props.note}&rdquo;</>}</span>
        {error && (
          <small className="field-error" role="alert">
            {error}
          </small>
        )}
      </div>
      <button type="button" className="btn btn-danger btn-sm" onClick={cancel} disabled={pending}>
        <Icon name="x" />
        Cancel request
      </button>
    </div>
  );
}
