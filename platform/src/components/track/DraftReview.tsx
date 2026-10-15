"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { approveDraftAction, requestChangesAction } from "@/app/(public)/[tenant]/track/feedback-actions";
import { Icon } from "@/components/icons/Icon";
import { whatsappLink } from "@/modules/content/contact";
import type { ClientResult } from "@/modules/orders/client-feedback.service";

type Props = {
  orderRef: string;
  changes: { canAsk: boolean; text: string };
  whatsapp: string;
  businessName: string;
};

type Failed = Extract<ClientResult, { ok: false }>;

// Under the draft on the tracking page: the client approves it, or tells the writer what to change
// (one note per round, with an optional file). Approving asks once more, so a slip can't close the order.
export function DraftReview({ orderRef, changes, whatsapp, businessName }: Props) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState<Failed | null>(null);
  const [fileName, setFileName] = useState("");
  const confirm = useRef<HTMLDialogElement>(null);

  const run = (action: () => Promise<ClientResult>, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      // On success the page reloads with the order's new stage
      if (result.ok) after?.();
      else setFailed(result);
    });

  const sendChanges = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFailed(null);
    run(() => requestChangesAction(orderRef, data));
  };

  const fieldError = (name: string) =>
    failed?.fieldErrors?.[name] && (
      <small className="field-error" role="alert">
        {failed.fieldErrors[name]}
      </small>
    );

  return (
    <div className="draft-answer">
      {!asking && (
        <div className="draft-answer-btns">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => confirm.current?.showModal()}
            disabled={pending}
          >
            <Icon name="check" />
            I&apos;m happy with it
          </button>
          {changes.canAsk && (
            <button type="button" className="btn btn-ghost" onClick={() => setAsking(true)} disabled={pending}>
              <Icon name="edit" />
              Ask for changes
            </button>
          )}
        </div>
      )}

      {!changes.canAsk && (
        <p className="rounds-note">
          {changes.text}{" "}
          <a
            href={whatsappLink(whatsapp, `Hi ${businessName}, I'd like more changes to my order ${orderRef}.`)}
            target="_blank"
            rel="noopener"
          >
            Message us on WhatsApp
          </a>{" "}
          if you need more changes.
        </p>
      )}

      {asking && (
        <form className="changes-form" onSubmit={sendChanges} noValidate>
          <div className="od-field">
            <label htmlFor="chg-text">What would you like changed?</label>
            <textarea
              id="chg-text"
              name="text"
              rows={4}
              maxLength={1000}
              placeholder="e.g. Put my KCB job first and remove my primary school."
              aria-invalid={Boolean(failed?.fieldErrors?.text)}
              required
            />
            {fieldError("text")}
          </div>
          <label className={fileName ? "cv-drop has-file" : "cv-drop"}>
            <input
              type="file"
              name="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
            <Icon name="upload" />
            <span>
              <strong>{fileName || "Attach a file (optional)"}</strong>
              <small>e.g. your copy with the changes marked. PDF, Word or photo, up to 10 MB.</small>
            </span>
          </label>
          {fieldError("file")}
          <p className="rounds-note">{changes.text}</p>
          {failed && !failed.fieldErrors && (
            <p className="od-error" role="alert">
              {failed.error}
            </p>
          )}
          <div className="draft-answer-btns">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              <Icon name="send" />
              {pending ? "Sending…" : "Send to my writer"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setAsking(false);
                setFailed(null);
              }}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!asking && failed && (
        <p className="od-error" role="alert">
          {failed.error}
        </p>
      )}

      <dialog ref={confirm} className="track-dialog" aria-labelledby="finish-title">
        <h2 id="finish-title">Finish your order?</h2>
        <p>Once you confirm, your order is complete and you can&apos;t ask for more changes.</p>
        {failed && (
          <p className="od-error" role="alert">
            {failed.error}
          </p>
        )}
        <div className="draft-answer-btns">
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={() => {
              setFailed(null);
              run(
                () => approveDraftAction(orderRef),
                () => confirm.current?.close(),
              );
            }}
          >
            {pending ? "Finishing…" : "Yes, I'm happy"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => confirm.current?.close()} disabled={pending}>
            Go back
          </button>
        </div>
      </dialog>
    </div>
  );
}
