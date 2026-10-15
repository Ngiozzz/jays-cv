"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useActionState, useState } from "react";
import { lookupOrderAction } from "@/app/(public)/[tenant]/track/actions";
import { Icon } from "@/components/icons/Icon";

// Order number + the phone number used to order: proof that the order is yours
export function LookupForm({ prefix }: { prefix: string }) {
  const params = useSearchParams();
  const [result, action, pending] = useActionState(lookupOrderAction, null);
  // Controlled, so a wrong try keeps what was typed (React clears a form once its action runs)
  const [order, setOrder] = useState(params.get("order") ?? "");
  const [phone, setPhone] = useState("");
  const failed = result && !result.ok ? result : null;
  const notice =
    params.get("link") === "invalid" ? "That tracking link isn't valid. Enter your details instead." : null;
  const cancelled = params.get("cancelled");

  // The client's old link to an unpaid order that was since deleted
  if (cancelled && !result)
    return <Cancelled text={`Order ${cancelled} was cancelled because it wasn't paid in time.`} />;
  if (failed?.cancelled) return <Cancelled text={failed.error} />;

  return (
    <form className="lookup-form" action={action} noValidate>
      {(failed?.error || notice) && (
        <p className="track-error" role="alert">
          <Icon name="info" />
          {failed?.error ?? notice}
        </p>
      )}
      <div className="field">
        <label htmlFor="lk-order">Order number</label>
        <input
          id="lk-order"
          name="order"
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          placeholder={`e.g. ${prefix}-1046`}
          autoComplete="off"
          aria-invalid={Boolean(failed?.fieldErrors?.order)}
          required
        />
        {failed?.fieldErrors?.order && <small className="field-error">{failed.fieldErrors.order}</small>}
      </div>
      <div className="field">
        <label htmlFor="lk-phone">Phone number you ordered with</label>
        <input
          id="lk-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="e.g. 0712 345 678"
          aria-invalid={Boolean(failed?.fieldErrors?.phone)}
          required
        />
        {failed?.fieldErrors?.phone && <small className="field-error">{failed.fieldErrors.phone}</small>}
      </div>
      <button className="btn btn-primary btn-lg" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Find my order"}
      </button>
    </form>
  );
}

function Cancelled({ text }: { text: string }) {
  return (
    <div className="lookup-cancelled" role="alert">
      <p className="track-error">
        <Icon name="info" />
        {text}
      </p>
      <p>Place a new order and your writer starts as soon as it&apos;s paid.</p>
      <Link className="btn btn-primary btn-lg" href="/order">
        Place a new order
      </Link>
    </div>
  );
}
