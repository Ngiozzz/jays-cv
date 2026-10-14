import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { OrderFileGroups } from "@/components/orders/OrderFileGroups";
import { formatKes } from "@/lib/money";
import { whatsappLink } from "@/modules/content/contact";
import type { OrderFileView } from "@/modules/orders/order-files";
import type { TrackedOrder } from "@/modules/orders/tracking.service";

// Times are shown in Kenya time, whatever the server's clock says
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "Africa/Nairobi",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "soon";

function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

// The client's view of their order: where it is, what happens next, and every update
export function TrackView({ order, businessName }: { order: TrackedOrder; businessName: string }) {
  const done = order.status === "DELIVERED";
  return (
    <>
      <div className="track-head">
        <p className="track-meta">
          Order {order.ref} · {order.itemName} · {formatKes(order.amount)}
        </p>
        <h1>Hi {order.greeting} 👋</h1>
        <p className="track-status">
          <span className={`ostatus ${order.statusTone}`}>{order.statusText}</span>
        </p>
      </div>

      <ol className="track-steps">
        {order.steps.map((label, i) => {
          const passed = i < order.step || done;
          return (
            <li key={label} className={passed ? "done" : i === order.step ? "current" : undefined}>
              <span>{passed ? <Icon name="check" /> : i + 1}</span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="track-card">
        <Stage order={order} />
      </div>

      <section className="track-card track-files">
        <h3>Your files</h3>
        <OrderFileGroups
          groups={[
            {
              title: `From ${businessName}`,
              hint: "Your drafts and final version, with notes from your writer.",
              files: order.files.fromUs,
              empty: "Your draft will appear here as soon as it's ready.",
              canOpen: true,
            },
            {
              title: "From you",
              hint: "What you sent with your order.",
              files: order.files.fromClient,
              empty: "You haven't sent any files.",
              canOpen: true,
            },
          ]}
        />
      </section>

      <div className="track-grid">
        <section className="track-card">
          <h3>Updates</h3>
          <ul className="timeline-mini">
            {order.updates.map((update, i) => (
              <li key={i}>
                <span className={update.who === "You" ? "dot client" : "dot"}></span>
                <div>
                  <p>
                    <b>{update.who}:</b> {update.text}
                  </p>
                  <small>{ago(update.at)}</small>
                </div>
              </li>
            ))}
            {order.updates.length === 0 && <li className="empty-note">Your order has been received.</li>}
          </ul>
        </section>
        <section className="track-card help-card">
          <h3>Need help?</h3>
          <p>Questions about your order? Message us on WhatsApp.</p>
          <a
            className="btn btn-wa btn-block"
            href={whatsappLink(order.whatsapp, `Hi ${businessName}, I have a question about my order ${order.ref}.`)}
            target="_blank"
            rel="noopener"
          >
            <Icon name="whatsapp" />
            WhatsApp us
          </a>
          <p className="private-note">
            <Icon name="lock" />
            This page is private to you. Don&apos;t share the link publicly.
          </p>
        </section>
      </div>
    </>
  );
}

function Stage({ order }: { order: TrackedOrder }) {
  const writer = order.writer ?? "Your writer";
  switch (order.status) {
    case "NEW":
    case "ABANDONED":
      return (
        <div className="stage stage-pay">
          <h2>
            <Icon name="phone" />
            Complete your payment
          </h2>
          <p>Your writer starts as soon as your payment is confirmed.</p>
          <div className="pay-cta">
            <div>
              <span>Amount</span>
              <strong>{formatKes(order.amount)}</strong>
            </div>
          </div>
          <div className="paybill-box">
            <span>
              On your phone: M-Pesa → Lipa na M-Pesa → <b>Pay Bill {order.paybill}</b> · Account <b>{order.ref}</b>
            </span>
          </div>
          <p className="secure-note">
            <Icon name="lock" />
            Paid directly to us by M-Pesa. Use the order number as the account number so we match it automatically.
          </p>
        </div>
      );
    case "PAID":
      return (
        <div className="stage">
          <h2>
            <Icon name="check" />
            Payment received: thank you!
          </h2>
          <p>
            We&apos;re assigning your writer now. Your draft will be ready by <strong>{when(order.draftDue)}</strong>.
          </p>
        </div>
      );
    case "WRITING":
      return (
        <div className="stage">
          <h2>
            <Icon name="edit" />
            {writer} is working on your order
          </h2>
          <p>
            Your draft will be ready by <strong>{when(order.draftDue)}</strong>. {writer} may call or WhatsApp you to
            ask about your achievements, so please keep your phone close.
          </p>
        </div>
      );
    case "REVISIONS":
      return (
        <div className="stage">
          <h2>
            <Icon name="refresh" />
            We&apos;re making your changes
          </h2>
          {order.lastChange && <blockquote className="change-request">&ldquo;{order.lastChange}&rdquo;</blockquote>}
          <p>
            Your revised draft will be ready by <strong>{when(order.revisionDue)}</strong>.
          </p>
        </div>
      );
    case "DRAFT_SENT":
      return (
        <div className="stage stage-review">
          <h2>
            <Icon name="doc" />
            Your draft is ready
          </h2>
          {order.files.fromUs[0] && <FileCard file={order.files.fromUs[0]} />}
          <p>
            Please read it carefully, then tell us on WhatsApp if you&apos;re happy or what you&apos;d like changed.{" "}
            {order.rounds}.
          </p>
          <p className="auto-note">
            <Icon name="clock" />
            If we don&apos;t hear from you, we&apos;ll send a reminder and complete your order automatically on{" "}
            {when(order.autoCompleteAt)}.
          </p>
        </div>
      );
    default:
      return (
        <div className="stage stage-done">
          <h2>
            <Icon name="check" />
            Your order is complete 🎉
          </h2>
          {order.files.fromUs[0] && <FileCard file={order.files.fromUs[0]} />}
          <p>
            You have <strong>30 days of free minor updates</strong>. Just message us on WhatsApp.
          </p>
          <Link className="btn btn-ghost" href="/jobs">
            <Icon name="briefcase" />
            Find jobs to apply for
          </Link>
        </div>
      );
  }
}

// The latest draft (or final) we sent: opened through the private file route, never a public link
function FileCard({ file }: { file: OrderFileView }) {
  return (
    <div className="draft-preview">
      <div>
        <strong>{file.name}</strong>
        <small>{file.label} · private to you</small>
        {file.note && <p className="file-note">&ldquo;{file.note}&rdquo;</p>}
        <div className="draft-btns">
          <a className="btn btn-primary btn-sm" href={file.url} target="_blank" rel="noopener">
            <Icon name="eye" />
            Open
          </a>
          <a className="btn btn-ghost btn-sm" href={`${file.url}?download`}>
            <Icon name="download" />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
