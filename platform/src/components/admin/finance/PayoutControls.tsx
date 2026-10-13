"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { recordPayoutAction, undoPayoutAction } from "@/app/(admin)/admin/(signed-in)/finance/actions";
import { Icon } from "@/components/icons/Icon";

type PayoutProps = { writerId: string; writerName: string; owed: number };

export function PayoutButton(props: PayoutProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        Record payout
      </button>
      {open && <PayoutDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function PayoutDialog({ writerId, writerName, owed, onClose }: PayoutProps & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const result = await recordPayoutAction(writerId, new FormData(event.currentTarget));
    setBusy(false);
    if (result.ok) dialog.current?.close();
    else setErrors(result.fieldErrors);
  };

  const error = (name: string) =>
    errors[name] && (
      <small className="field-error" role="alert">
        {errors[name]}
      </small>
    );

  return (
    <dialog ref={dialog} className="admin-dialog" onClose={onClose} aria-labelledby="payout-title">
      <form className="dialog-body" noValidate onSubmit={submit}>
        <h2 id="payout-title">Record a payout to {writerName}</h2>
        <p>Send the money by M-Pesa as usual, then record it here so the balance is right.</p>
        {error("form")}
        <div className="fgrid">
          <div className={errors.amount ? "f invalid" : "f"}>
            <label htmlFor="po-amount">Amount (KES)</label>
            <input id="po-amount" name="amount" type="number" min={1} max={owed} step={1} defaultValue={owed} />
            {error("amount")}
          </div>
          <div className={errors.reference ? "f invalid" : "f"}>
            <label htmlFor="po-reference">M-Pesa code</label>
            <input
              id="po-reference"
              name="reference"
              placeholder="e.g. SJT7Q2KX4M"
              autoComplete="off"
              style={{ textTransform: "uppercase" }}
            />
            <small>From the M-Pesa message you got after sending.</small>
            {error("reference")}
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Record payout"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

// For a payout recorded by mistake; asks first, then the amount goes back to "Owed now"
export function UndoPayoutButton({ payoutId, label }: { payoutId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const undo = () => {
    if (!window.confirm(`Remove the payout of ${label}? It will show as owed again.`)) return;
    startTransition(async () => {
      const result = await undoPayoutAction(payoutId);
      setError(result.ok ? null : result.error);
    });
  };
  return (
    <span>
      <button type="button" className="btn btn-danger btn-sm" onClick={undo} disabled={pending}>
        <Icon name="trash" />
        Remove
      </button>
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}
