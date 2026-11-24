import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { OrderFileGroups } from "@/components/orders/OrderFileGroups";
import { PayBox } from "@/components/pay/PayBox";
import { Breadcrumb } from "@/components/site/PageHero";
import { DraftReview } from "@/components/track/DraftReview";
import { ReviewForm } from "@/components/track/ReviewForm";
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

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// The client's files were deleted for privacy (the order itself stays)
const filesGone = (order: TrackedOrder) =>
  order.status === "DELIVERED" &&
  order.filesDeleteOn !== null &&
  new Date(order.filesDeleteOn).getTime() <= Date.now() &&
  order.files.fromUs.length === 0 &&
  order.files.fromClient.length === 0;

// "Tue 14:05", in Kenya time
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// The client's view of their order: where it is, what happens next, and every update
export function TrackView({ order, businessName }: { order: TrackedOrder; businessName: string }) {
  const done = order.status === "DELIVERED";
  const paid = order.amount - order.amountDue;
  return (
    <>
      <header className="t-head">
        <Breadcrumb left crumbs={[{ label: "Track my order", href: "/track" }, { label: order.ref }]} />
        <span className="t-ref">Order {order.ref}</span>
        <h1>Hi {order.greeting}</h1>
        <p className="t-sub">
          {order.itemName} · {formatKes(order.amount)} ·{" "}
          <span className={`ostatus ${order.statusTone}`}>{order.statusText}</span>
        </p>
        <ol className="stages">
          {order.steps.map((label, i) => {
            const passed = i < order.step || done;
            return (
              <li
                key={label}
                className={passed ? "done" : i === order.step ? "now" : undefined}
                aria-current={!passed && i === order.step ? "step" : undefined}
              >
                <i aria-hidden="true" />
                <b>{label}</b>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="t-grid">
        <div className="t-main">
          <section className="card t-card track-card">
            <Stage order={order} businessName={businessName} />
          </section>

          {done && !order.reviewed && <ReviewForm orderRef={order.ref} name={order.reviewName} />}

          {!filesGone(order) && (
            <section className="card t-card track-files">
              <h2>Your files</h2>
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
          )}

          <section className="card t-card">
            <h2>Updates</h2>
            <ol className="timeline-mini">
              {[...order.updates].reverse().map((update, i) => (
                <li key={i} className={update.who === "You" ? "client" : undefined}>
                  <time dateTime={update.at}>{stamp(update.at)}</time>
                  <span className="dot" aria-hidden="true"></span>
                  <p>
                    {update.who}: {update.text}
                  </p>
                </li>
              ))}
              {order.updates.length === 0 && <li className="empty-note">Your order has been received.</li>}
            </ol>
          </section>
        </div>

        <aside className="t-side">
          {order.writer && (
            <div className="card">
              <h3>Your writer</h3>
              <div className="t-writer">
                <span className="av" aria-hidden="true">
                  {order.writer[0]}
                </span>
                <b>{order.writer}</b>
              </div>
            </div>
          )}
          <div className="card">
            <h3>Your order</h3>
            <dl className="kv">
              <div>
                <dt>Order</dt>
                <dd>{order.itemName}</dd>
              </div>
              <div>
                <dt>{order.amountDue > 0 ? "Still to pay" : "Paid"}</dt>
                <dd>{formatKes(order.amountDue > 0 ? order.amountDue : paid)}</dd>
              </div>
              <div>
                <dt>Revisions</dt>
                <dd>{order.rounds}</dd>
              </div>
              <div>
                <dt>After delivery</dt>
                <dd>30 days of free minor updates</dd>
              </div>
            </dl>
          </div>
          <div className="card">
            <h3>Need anything else?</h3>
            <p>A cover letter for a job you&apos;re applying to, or your CV updated later: order it here.</p>
            <div className="t-side-links">
              <Link className="btn btn-ghost btn-sm" href={order.coverLetterHref}>
                Order a cover letter
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/jobs">
                Find jobs to apply for
              </Link>
            </div>
          </div>
          <div className="card">
            <h3>Need help?</h3>
            <p>Questions about your order? Message us on WhatsApp.</p>
            <a
              className="btn btn-ghost btn-sm"
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
          </div>
        </aside>
      </div>
    </>
  );
}

function Stage({ order, businessName }: { order: TrackedOrder; businessName: string }) {
  const writer = order.writer ?? "Your writer";
  switch (order.status) {
    case "NEW":
    case "ABANDONED":
      return (
        <div className="stage stage-pay">
          <h2>Complete your payment</h2>
          <p>Your writer starts as soon as your payment is confirmed.</p>
          {order.amountDue < order.amount && (
            <p className="part-paid">
              <Icon name="check" />
              {formatKes(order.amount - order.amountDue)} received, <strong>{formatKes(order.amountDue)} left</strong>{" "}
              to pay.
            </p>
          )}
          <PayBox
            info={{
              ref: order.ref,
              amountDue: order.amountDue,
              phone: order.payPhone,
              paybill: order.paybill,
              businessName,
              pretend: order.pretendMpesa,
            }}
          />
        </div>
      );
    case "PAID":
      return (
        <div className="stage">
          <h2>Payment received, thank you</h2>
          <p>
            We&apos;re assigning your writer now. Your draft will be ready by <strong>{when(order.draftDue)}</strong>.
          </p>
        </div>
      );
    case "WRITING":
      return (
        <div className="stage">
          <h2>{writer} is working on your order</h2>
          <p>
            Your draft will be ready by <strong>{when(order.draftDue)}</strong>. {writer} may call or WhatsApp you to
            ask about your achievements, so please keep your phone close.
          </p>
        </div>
      );
    case "REVISIONS":
      return (
        <div className="stage">
          <h2>We&apos;re making your changes</h2>
          {order.lastChange && <blockquote className="change-request">&ldquo;{order.lastChange}&rdquo;</blockquote>}
          <p>
            Your revised draft will be ready by <strong>{when(order.revisionDue)}</strong>.
          </p>
        </div>
      );
    case "DRAFT_SENT":
      return (
        <div className="stage stage-review">
          <h2>Your draft is ready</h2>
          {order.files.fromUs[0] && <FileCard file={order.files.fromUs[0]} />}
          <p>Please read it carefully, then tell your writer if you&apos;re happy or what you&apos;d like changed.</p>
          <DraftReview
            orderRef={order.ref}
            changes={order.changes}
            whatsapp={order.whatsapp}
            businessName={businessName}
          />
          <p className="auto-note">
            <Icon name="clock" />
            If we don&apos;t hear from you by {when(order.autoCompleteAt)}, we&apos;ll mark your order as complete.
          </p>
        </div>
      );
    default:
      return (
        <div className="stage stage-done">
          <h2>Your order is complete</h2>
          {order.files.fromUs[0] ? (
            <>
              <FileCard file={order.files.fromUs[0]} />
              {order.filesDeleteOn && (
                <p className="auto-note">
                  <Icon name="lock" />
                  For your privacy, we keep your files until {day(order.filesDeleteOn)}. Download your CV now so you
                  always have it.
                </p>
              )}
            </>
          ) : (
            filesGone(order) && (
              <p className="files-gone">
                <Icon name="lock" />
                <span>
                  For your privacy, your files were deleted on {day(order.filesDeleteOn!)}. Need a copy?{" "}
                  <a
                    href={whatsappLink(
                      order.whatsapp,
                      `Hi ${businessName}, I need a copy of my CV from order ${order.ref}.`,
                    )}
                    target="_blank"
                    rel="noopener"
                  >
                    Message us on WhatsApp
                  </a>
                  .
                </span>
              </p>
            )
          )}
          <p>
            You have <strong>30 days of free minor updates</strong>. Just message us on WhatsApp.
          </p>
          {order.reviewed && (
            <p className="review-thanks">
              <span className="stars" aria-label={`${order.reviewed.rating} stars`}>
                {"★".repeat(order.reviewed.rating)}
                {"☆".repeat(5 - order.reviewed.rating)}
              </span>
              Thank you for your review.
            </p>
          )}
          <div className="draft-answer-btns">
            <Link className="btn btn-primary" href="/order">
              Order again
            </Link>
          </div>
        </div>
      );
  }
}

// The latest draft (or final) we sent: opened through the private file route, never a public link
function FileCard({ file }: { file: OrderFileView }) {
  return (
    <div className="draft-preview">
      <span className="draft-page" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
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
