"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  acceptOrderAction,
  addNoteAction,
  completeOrderAction,
  extendDeadlineAction,
  logChangesAction,
  reassignOrderAction,
  recordPaymentAction,
  sendDraftAction,
} from "@/app/(admin)/admin/(signed-in)/orders/actions";
import { useToast } from "@/components/admin/content/useSave";
import { Icon } from "@/components/icons/Icon";
import type { ActionResult } from "@/modules/orders/order-actions.service";

// The controls on the team's order page. Each runs one server step and shows its answer as a toast;
// the page then reloads with the order's new state.

function useOrderAction() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const run = (action: () => Promise<ActionResult>, after?: (ok: boolean) => void) =>
    startTransition(async () => {
      const result = await action();
      toast(result.ok ? { text: result.message, error: false } : { text: result.error, error: true });
      after?.(result.ok);
    });
  return { pending, run };
}

export function AcceptButton({ orderId, label, block = false }: { orderId: string; label: string; block?: boolean }) {
  const { pending, run } = useOrderAction();
  return (
    <button
      type="button"
      className={block ? "btn btn-primary btn-block" : "btn btn-primary"}
      disabled={pending}
      onClick={() => run(() => acceptOrderAction(orderId))}
    >
      <Icon name="check" />
      {pending ? "Accepting…" : label}
    </button>
  );
}

// Sending needs a file, so "sent" always means the client really has a draft
export function SendDraft({ orderId }: { orderId: string }) {
  const { pending, run } = useOrderAction();
  const [name, setName] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(
      () => sendDraftAction(orderId, data),
      (ok) => {
        if (ok) {
          form.reset();
          setName("");
        }
      },
    );
  };
  return (
    <form className="send-draft" onSubmit={submit}>
      <label className="btn btn-ghost">
        <Icon name="upload" />
        {name || "Choose the draft…"}
        <input
          type="file"
          name="draft"
          accept=".doc,.docx,.pdf,.jpg,.jpeg,.png"
          hidden
          onChange={(event) => setName(event.target.files?.[0]?.name ?? "")}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending || !name}>
        <Icon name="send" />
        {pending ? "Sending…" : "Send draft to client"}
      </button>
      <label className="send-draft-note">
        <span>
          Message to the client <small>(optional, shown with the file)</small>
        </span>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          placeholder="e.g. I reworked your summary and moved your awards up."
        />
      </label>
    </form>
  );
}

const VIA = ["WhatsApp call", "WhatsApp chat", "Phone call", "Email"];

// The team records what the client asked for on a call or in a chat
export function LogChanges({ orderId, roundsLabel }: { orderId: string; roundsLabel: string }) {
  const { pending, run } = useOrderAction();
  const dialog = useRef<HTMLDialogElement>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => logChangesAction(orderId, data),
      (ok) => ok && dialog.current?.close(),
    );
  };
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.showModal()}>
        <Icon name="edit" />
        Client asked for changes…
      </button>
      <dialog ref={dialog} className="admin-dialog" aria-labelledby="chg-title">
        <form className="dialog-body" onSubmit={submit}>
          <h2 id="chg-title">What did the client ask for?</h2>
          <p>{roundsLabel}. Write the changes exactly as agreed, so everyone knows what was promised.</p>
          <div className="f">
            <label htmlFor="chg-text">Requested changes</label>
            <textarea
              id="chg-text"
              name="text"
              rows={4}
              maxLength={1000}
              placeholder="e.g. Add the 2022 sales award; shorten page 2"
              required
            />
          </div>
          <div className="f" style={{ marginTop: 12 }}>
            <label htmlFor="chg-via">How did they ask?</label>
            <select id="chg-via" name="via" defaultValue={VIA[0]}>
              {VIA.map((via) => (
                <option key={via}>{via}</option>
              ))}
            </select>
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Move to revisions"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function CompleteButton({ orderId }: { orderId: string }) {
  const { pending, run } = useOrderAction();
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={pending}
      onClick={() => {
        if (window.confirm("Mark this order complete? Do this once the client has approved the draft."))
          run(() => completeOrderAction(orderId));
      }}
    >
      <Icon name="check" />
      {pending ? "Completing…" : "Client approved: complete"}
    </button>
  );
}

export function RecordPayment({ orderId }: { orderId: string }) {
  const { pending, run } = useOrderAction();
  const [reference, setReference] = useState("");
  return (
    <details className="manual-pay">
      <summary>Client paid but it&apos;s not showing?</summary>
      <div className="f">
        <label htmlFor="mpesa-code">M-Pesa code (or cash / bank reference)</label>
        <input
          type="text"
          id="mpesa-code"
          value={reference}
          onChange={(event) => setReference(event.target.value.toUpperCase())}
          placeholder="e.g. UJ4K7Q2XMB"
          maxLength={30}
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-block btn-sm"
        style={{ marginTop: 8 }}
        disabled={pending || reference.trim().length < 4}
        onClick={() => run(() => recordPaymentAction(orderId, reference))}
      >
        {pending ? "Recording…" : "Record payment"}
      </button>
      <small className="hint-sm">One reference can only pay one order.</small>
    </details>
  );
}

export function Reassign({ orderId, writers }: { orderId: string; writers: { id: string; displayName: string }[] }) {
  const { pending, run } = useOrderAction();
  return (
    <div className="f reassign">
      <label htmlFor="reassign">Reassign (owner only)</label>
      <select
        id="reassign"
        value=""
        disabled={pending}
        onChange={(event) => {
          const writer = writers.find((w) => w.id === event.target.value);
          if (writer && window.confirm(`Move this order to ${writer.displayName}?`))
            run(() => reassignOrderAction(orderId, writer.id));
        }}
      >
        <option value="">{pending ? "Moving…" : "Choose a writer…"}</option>
        {writers.map((writer) => (
          <option key={writer.id} value={writer.id}>
            {writer.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ExtendButton({ orderId }: { orderId: string }) {
  const { pending, run } = useOrderAction();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={pending}
      onClick={() => run(() => extendDeadlineAction(orderId))}
    >
      <Icon name="clock" />
      Give 24 more hours
    </button>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const { pending, run } = useOrderAction();
  const [text, setText] = useState("");
  return (
    <form
      className="note-form"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => addNoteAction(orderId, text),
          (ok) => ok && setText(""),
        );
      }}
    >
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Add an internal note…"
        aria-label="Internal note"
        maxLength={500}
      />
      <button className="btn btn-primary btn-sm" type="submit" disabled={pending || !text.trim()}>
        Add
      </button>
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast({ text: "Tracking link copied.", error: false });
        } catch {
          toast({ text: "Couldn't copy. Select the link and copy it instead.", error: true });
        }
      }}
    >
      <Icon name="copy" />
      Copy
    </button>
  );
}
